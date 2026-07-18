import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSocket, connectSocket } from '../../../shared/api/socket.ts';
import { apiGet } from '../../../shared/api/client.ts';
import CoordBadge from '../components/CoordBadge.tsx';
import AnimatedCadetMarkers, { type CadetMarker } from '../components/AnimatedCadetMarkers.tsx';
import LocateControl from '../components/LocateControl.tsx';
import {
  UsersIcon,
  SearchIcon,
  FilterIcon,
  CenterIcon,
  CloseIcon,
  PinIcon,
} from '../components/CoordIcons.tsx';
import type { CadetLocation, CadeteStatus } from '@cambioapp/shared-types';

// Buenos Aires center
const BA_CENTER: [number, number] = [-34.6037, -58.3816];
const BA_ZOOM = 13;

const STATUS_COLORS: Record<string, string> = {
  disponible: '#0F6E56',
  asignada: '#854F0B',
  en_camino: '#185FA5',
  en_destino: '#1e3a8a',
  volviendo: '#3C3489',
  incidencia: '#993C1D',
};

type Group = 'onWay' | 'asignada' | 'disponible' | 'incidencia' | 'sinConexion';

const GROUP_LABELS: Record<Group, string> = {
  onWay: 'En camino',
  asignada: 'Asignado',
  disponible: 'Disponible',
  incidencia: 'Incidencia',
  sinConexion: 'Sin conexión',
};

const GROUP_ORDER: Group[] = ['onWay', 'asignada', 'disponible', 'incidencia', 'sinConexion'];

const timeFormatter = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' });

interface LocationPayload {
  cadeteId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
}

export default function MapaTab() {
  const qc = useQueryClient();
  // Posiciones en vivo recibidas por socket (se actualizan al instante)
  const [livePositions, setLivePositions] = useState<Record<string, [number, number]>>({});

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => apiGet<CadetLocation[]>('/locations/current'),
    // Aparecen rápido: refresca siempre al abrir el mapa y cada 10s como red de
    // seguridad (las posiciones en vivo igual llegan al instante por socket).
    refetchInterval: 10_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Referencia a la lista actual para usarla dentro del listener del socket
  const locationsRef = useRef<CadetLocation[]>([]);
  locationsRef.current = locations;

  // Instancia del mapa, para poder centrarlo al tocar un cadete de la lista
  const mapRef = useRef<LeafletMap | null>(null);

  const [panel, setPanel] = useState<'cadetes' | 'filtros'>('cadetes');
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Group | 'todos'>('todos');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const posOf = (loc: CadetLocation): [number, number] | null =>
    livePositions[loc.cadeteId] ??
    (loc.latitude != null && loc.longitude != null ? [loc.latitude, loc.longitude] : null);

  const focusCadete = (loc: CadetLocation) => {
    const pos = posOf(loc);
    if (pos) mapRef.current?.flyTo(pos, 16, { duration: 0.8 });
    setSelectedId(loc.cadeteId);
  };

  const centerMap = () => {
    mapRef.current?.flyTo(BA_CENTER, BA_ZOOM, { duration: 0.8 });
    setSelectedId(null);
  };

  function groupOf(loc: CadetLocation): Group {
    if (!posOf(loc)) return 'sinConexion';
    const status = loc.cadeteStatus ?? 'disponible';
    if (status === 'en_camino' || status === 'en_destino' || status === 'volviendo') return 'onWay';
    if (status === 'asignada') return 'asignada';
    if (status === 'incidencia') return 'incidencia';
    return 'disponible';
  }

  // Escuchar posiciones en vivo por socket y guardarlas en estado local
  useEffect(() => {
    connectSocket();
    const s = getSocket();
    const onLoc = (p: LocationPayload) => {
      setLivePositions((prev) => ({ ...prev, [p.cadeteId]: [p.lat, p.lng] }));
      // Si es un cadete que todavía no tenemos (recién empezó a compartir),
      // refrescar para traer su metadata y que aparezca el marcador.
      const known = locationsRef.current.some((l) => l.cadeteId === p.cadeteId);
      if (!known) qc.invalidateQueries({ queryKey: ['locations'] });
    };
    s.on('location:updated', onLoc);
    return () => {
      s.off('location:updated', onLoc);
    };
  }, [qc]);

  // Limpiar posiciones en vivo de cadetes que ya no están en estados activos.
  useEffect(() => {
    const active = new Set(locations.map((l) => l.cadeteId));
    setLivePositions((prev) => {
      const kept = Object.entries(prev).filter(([id]) => active.has(id));
      return kept.length === Object.keys(prev).length ? prev : Object.fromEntries(kept);
    });
  }, [locations]);

  // Solo se crean marcadores para cadetes con coordenadas conocidas.
  // Los que aparecen en la lista pero sin GPS aún no tienen posición y no
  // pueden pintarse en el mapa.
  const cadets: CadetMarker[] = useMemo(
    () =>
      locations.flatMap((loc) => {
        const status = loc.cadeteStatus ?? 'disponible';
        const live = livePositions[loc.cadeteId];
        const position: [number, number] | null =
          live ??
          (loc.latitude != null && loc.longitude != null ? [loc.latitude, loc.longitude] : null);
        if (!position) return [];
        return [
          {
            cadeteId: loc.cadeteId,
            nombre: loc.cadete?.nombre ?? '?',
            color: STATUS_COLORS[status] ?? '#6b7280',
            statusLabel: status,
            position,
          },
        ];
      }),
    [locations, livePositions],
  );

  const grouped = useMemo(() => {
    const byGroup: Record<Group, CadetLocation[]> = {
      onWay: [],
      asignada: [],
      disponible: [],
      incidencia: [],
      sinConexion: [],
    };
    const q = query.trim().toLowerCase();
    for (const loc of locations) {
      if (q && !(loc.cadete?.nombre ?? '').toLowerCase().includes(q)) continue;
      byGroup[groupOf(loc)].push(loc);
    }
    return byGroup;
  }, [locations, query, livePositions]);

  const counts = useMemo(() => {
    const c: Record<Group, number> = {
      onWay: 0,
      asignada: 0,
      disponible: 0,
      incidencia: 0,
      sinConexion: 0,
    };
    for (const loc of locations) c[groupOf(loc)] += 1;
    return c;
  }, [locations, livePositions]);

  const selectedLoc = locations.find((l) => l.cadeteId === selectedId) ?? null;

  const visibleGroups = GROUP_ORDER.filter((g) => activeFilter === 'todos' || activeFilter === g);

  return (
    <section className="coord-map-card">
      <aside className="coord-map-sidebar">
        <div className="coord-map-tabs">
          <button
            type="button"
            className={panel === 'cadetes' ? 'is-active' : ''}
            onClick={() => setPanel('cadetes')}
          >
            <UsersIcon />
            Cadetes
          </button>
          <button
            type="button"
            className={panel === 'filtros' ? 'is-active' : ''}
            onClick={() => setPanel('filtros')}
          >
            <FilterIcon />
            Filtros
          </button>
        </div>

        {panel === 'cadetes' ? (
          <div className="coord-map-sidebar__scroll">
            <label className="coord-map-search">
              <SearchIcon />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cadete..."
              />
            </label>

            {locations.length === 0 && <p className="coord-map-empty">Sin cadetes activos</p>}

            {visibleGroups.map((g) => {
              const items = grouped[g];
              if (items.length === 0) return null;
              return (
                <div key={g}>
                  <h3 className={`coord-map-group-title coord-map-group-title--${g}`}>
                    {GROUP_LABELS[g]} ({items.length})
                  </h3>
                  {items.map((loc) => {
                    const hasGps = posOf(loc) != null;
                    return (
                      <button
                        key={loc.cadeteId}
                        type="button"
                        className={`coord-map-list__item ${selectedId === loc.cadeteId ? 'is-selected' : ''}`}
                        onClick={() => (hasGps ? focusCadete(loc) : undefined)}
                        disabled={!hasGps}
                      >
                        <span
                          className="coord-avatar coord-avatar--small"
                          style={{
                            background: 'none',
                            borderColor:
                              STATUS_COLORS[loc.cadeteStatus ?? 'disponible'] ?? '#6b7280',
                          }}
                        >
                          {loc.cadete?.nombre?.[0] ?? '?'}
                        </span>
                        <span className="coord-map-list__copy">
                          <strong>{loc.cadete?.nombre}</strong>
                          {!hasGps && <small>Sin GPS</small>}
                        </span>
                        <CoordBadge status={(loc.cadeteStatus ?? 'disponible') as CadeteStatus} />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="coord-map-filters">
            <button
              type="button"
              className={activeFilter === 'todos' ? 'is-active' : ''}
              onClick={() => setActiveFilter('todos')}
            >
              Todos
            </button>
            {GROUP_ORDER.map((g) => (
              <button
                key={g}
                type="button"
                className={activeFilter === g ? 'is-active' : ''}
                onClick={() => {
                  setActiveFilter(g);
                  setPanel('cadetes');
                }}
              >
                {GROUP_LABELS[g]} ({counts[g]})
              </button>
            ))}
          </div>
        )}

        <button type="button" className="coord-center-btn" onClick={centerMap}>
          <CenterIcon />
          Centrar mapa
        </button>
      </aside>

      <div className="coord-map-surface">
        <MapContainer
          ref={mapRef}
          center={BA_CENTER}
          zoom={BA_ZOOM}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          <AnimatedCadetMarkers cadets={cadets} />
          <LocateControl />
        </MapContainer>

        {selectedLoc && (
          <article className="coord-map-person-card">
            <span className="coord-avatar">{selectedLoc.cadete?.nombre?.[0] ?? '?'}</span>
            <div className="coord-map-person-card__body">
              <strong>{selectedLoc.cadete?.nombre ?? 'Cadete'}</strong>
              <CoordBadge status={(selectedLoc.cadeteStatus ?? 'disponible') as CadeteStatus} />
            </div>
            <div>
              <span>Última actualización</span>
              <strong>
                {selectedLoc.updatedAt
                  ? timeFormatter.format(new Date(selectedLoc.updatedAt))
                  : '—'}
              </strong>
            </div>
            <div>
              <span>
                <PinIcon />
                Precisión GPS
              </span>
              <strong>
                {selectedLoc.accuracy != null ? `± ${Math.round(selectedLoc.accuracy)} m` : '—'}
              </strong>
            </div>
            <button
              type="button"
              className="coord-map-person-card__close"
              onClick={() => setSelectedId(null)}
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>
          </article>
        )}
      </div>
    </section>
  );
}
