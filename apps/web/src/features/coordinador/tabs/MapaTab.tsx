import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSocket, connectSocket } from '../../../shared/api/socket.ts';
import { apiGet } from '../../../shared/api/client.ts';
import StatusBadge from '../../../shared/components/StatusBadge.tsx';
import AnimatedCadetMarkers, { type CadetMarker } from '../components/AnimatedCadetMarkers.tsx';
import LocateControl from '../components/LocateControl.tsx';
import type { CadetLocation, CadeteStatus } from '@cambioapp/shared-types';

// Buenos Aires center
const BA_CENTER: [number, number] = [-34.6037, -58.3816];

const STATUS_COLORS: Record<string, string> = {
  disponible: '#0F6E56',
  asignada: '#854F0B',
  en_camino: '#185FA5',
  en_destino: '#1e3a8a',
  volviendo: '#3C3489',
  incidencia: '#993C1D',
};

const STATUS_LABELS: Record<string, string> = {
  disponible: 'Disponible',
  asignada: 'Asignada',
  en_camino: 'En camino',
  en_destino: 'En destino',
  volviendo: 'Volviendo',
  incidencia: 'Incidencia',
};

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

  const focusCadete = (loc: CadetLocation) => {
    const pos = livePositions[loc.cadeteId] ??
      (loc.latitude != null && loc.longitude != null ? [loc.latitude, loc.longitude] as [number, number] : null);
    if (pos) mapRef.current?.flyTo(pos, 16, { duration: 0.8 });
  };

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
    return () => { s.off('location:updated', onLoc); };
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
          live ?? (loc.latitude != null && loc.longitude != null ? [loc.latitude, loc.longitude] : null);
        if (!position) return [];
        return [{
          cadeteId: loc.cadeteId,
          nombre: loc.cadete?.nombre ?? '?',
          color: STATUS_COLORS[status] ?? '#6b7280',
          statusLabel: STATUS_LABELS[status] ?? status,
          position,
        }];
      }),
    [locations, livePositions],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <MapContainer
          ref={mapRef}
          center={BA_CENTER}
          zoom={13}
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
      </div>

      <div className="p-3 bg-white border-t border-gray-200 max-h-48 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Cadetes en el mapa <span className="font-normal normal-case">— tocá uno para centrarlo</span></p>
        <div className="space-y-1">
          {locations.length === 0 && <p className="text-sm text-gray-400">Sin cadetes activos</p>}
          {locations.map((loc) => {
            const hasGps = loc.latitude != null || livePositions[loc.cadeteId] != null;
            return (
              <button
                key={loc.cadeteId}
                type="button"
                onClick={() => hasGps ? focusCadete(loc) : undefined}
                disabled={!hasGps}
                className="w-full flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-gray-100 active:bg-gray-200 transition-colors text-left disabled:opacity-60 disabled:cursor-default"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: STATUS_COLORS[loc.cadeteStatus ?? 'disponible'] ?? '#6b7280' }}
                  >
                    {loc.cadete?.nombre?.[0] ?? '?'}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{loc.cadete?.nombre}</span>
                    {!hasGps && <p className="text-xs text-amber-500">Sin GPS</p>}
                  </div>
                </div>
                <StatusBadge status={(loc.cadeteStatus ?? 'disponible') as CadeteStatus} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
