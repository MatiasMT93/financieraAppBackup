import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export interface CadetMarker {
  cadeteId: string;
  nombre: string;
  color: string;
  statusLabel: string;
  /** Última posición conocida [lat, lng] */
  position: [number, number];
}

interface Entry {
  marker: L.Marker;
  to: [number, number];
  lastTargetTime: number;
  color: string;
}

// Límites de duración del deslizamiento (ms). Se adapta al ritmo real de updates.
const MIN_DURATION = 500;
const MAX_DURATION = 4000;

function makeIcon(initial: string, color: string) {
  return L.divIcon({
    html: `<div style="width:34px;height:34px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${initial}</div>`,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

function popupHtml(c: CadetMarker) {
  return `<div style="font-size:13px"><strong>${c.nombre}</strong><br/><span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:9999px;background:${c.color};color:#fff;font-size:11px">${c.statusLabel}</span></div>`;
}

function iconEl(marker: L.Marker): HTMLElement | undefined {
  // _icon es el div que Leaflet posiciona con transform; es API interna pero
  // estable y la usamos para animar por CSS.
  return (marker as unknown as { _icon?: HTMLElement })._icon;
}

/**
 * Renderiza los marcadores de los cadetes de forma imperativa y los desliza
 * suavemente entre la posición anterior y la nueva.
 *
 * La animación se hace con TRANSICIONES CSS sobre el `transform` del marcador,
 * no con requestAnimationFrame: así el navegador interpola en el hilo del
 * compositor (GPU), fuera del hilo principal. Es mucho más fluido en móvil/PWA,
 * donde los tiles del mapa y React ya ocupan el main thread.
 */
export default function AnimatedCadetMarkers({ cadets }: { cadets: CadetMarker[] }) {
  const map = useMap();
  const entries = useRef<Record<string, Entry>>({});

  // Durante el zoom Leaflet reposiciona los marcadores; si tienen una transición
  // CSS activa, "patinan" persiguiendo al zoom. La desactivamos al empezar el
  // zoom; el próximo update de posición la vuelve a habilitar.
  useEffect(() => {
    const disableTransitions = () => {
      for (const e of Object.values(entries.current)) {
        const el = iconEl(e.marker);
        if (el) el.style.transition = 'none';
      }
    };
    map.on('zoomstart', disableTransitions);
    return () => { map.off('zoomstart', disableTransitions); };
  }, [map]);

  useEffect(() => {
    const present = new Set(cadets.map((c) => c.cadeteId));

    // Eliminar marcadores de cadetes que ya no están
    for (const id of Object.keys(entries.current)) {
      if (!present.has(id)) {
        map.removeLayer(entries.current[id].marker);
        delete entries.current[id];
      }
    }

    const now = performance.now();

    for (const c of cadets) {
      const initial = c.nombre?.[0]?.toUpperCase() ?? '?';
      const existing = entries.current[c.cadeteId];

      if (!existing) {
        // Primer avistaje: aparece directo en su posición, sin animación
        const marker = L.marker(c.position, { icon: makeIcon(initial, c.color) }).addTo(map);
        marker.bindPopup(popupHtml(c));
        entries.current[c.cadeteId] = {
          marker,
          to: c.position,
          lastTargetTime: now,
          color: c.color,
        };
        continue;
      }

      // Actualizar icono si cambió el estado (color). setIcon recrea el _icon,
      // pero la transición se vuelve a setear en cada movimiento, así que ok.
      if (existing.color !== c.color) {
        existing.marker.setIcon(makeIcon(initial, c.color));
        existing.color = c.color;
      }
      existing.marker.setPopupContent(popupHtml(c));

      // Si la posición objetivo cambió, deslizar desde la posición actual
      const [tlat, tlng] = c.position;
      const [olat, olng] = existing.to;
      if (tlat !== olat || tlng !== olng) {
        // La duración se adapta al tiempo entre updates, así el marcador llega
        // justo cuando llega el próximo punto (movimiento continuo, sin saltos).
        const delta = now - existing.lastTargetTime;
        const duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, delta));
        existing.lastTargetTime = now;
        existing.to = c.position;

        const el = iconEl(existing.marker);
        if (el) el.style.transition = `transform ${duration}ms linear`;
        // setLatLng actualiza el transform; el navegador anima la transición.
        existing.marker.setLatLng(c.position);
      }
    }
  }, [cadets, map]);

  // Limpieza al desmontar
  useEffect(() => {
    const current = entries.current;
    return () => {
      for (const e of Object.values(current)) {
        map.removeLayer(e.marker);
      }
    };
  }, [map]);

  return null;
}
