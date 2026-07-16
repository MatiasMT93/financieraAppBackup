import { useEffect, useRef, useState } from 'react';
import { useMap, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';

// Punto azul estilo Google Maps para "mi ubicación"
function userDotIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:#1a73e8;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 2px rgba(26,115,232,0.35),0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

/**
 * Agrega el botón "mi ubicación" (abajo a la derecha) y muestra la posición
 * actual del coordinador con un punto azul + círculo de precisión.
 * Si el permiso de ubicación ya está concedido, centra automáticamente al abrir.
 */
export default function LocateControl() {
  const map = useMap();
  const [pos, setPos] = useState<{ latlng: L.LatLng; accuracy: number } | null>(null);
  const userInitiated = useRef(false);

  useEffect(() => {
    const locate = (fromButton: boolean) => {
      userInitiated.current = fromButton;
      map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
    };

    const onFound = (e: L.LocationEvent) => {
      userInitiated.current = false;
      setPos({ latlng: e.latlng, accuracy: e.accuracy });
    };
    const onError = () => {
      if (userInitiated.current) {
        userInitiated.current = false;
        alert('No se pudo obtener tu ubicación. Revisá los permisos de ubicación del navegador.');
      }
    };

    map.on('locationfound', onFound);
    map.on('locationerror', onError);

    // Botón de control (estilo Google: blanco, redondeado, abajo a la derecha)
    const control = new L.Control({ position: 'bottomright' });
    control.onAdd = () => {
      const btn = L.DomUtil.create('button');
      btn.type = 'button';
      btn.title = 'Mi ubicación';
      btn.style.cssText =
        'width:42px;height:42px;border-radius:10px;background:#fff;border:none;' +
        'box-shadow:0 1px 5px rgba(0,0,0,0.35);cursor:pointer;display:flex;' +
        'align-items:center;justify-content:center;margin:0 10px 18px 0;';
      btn.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"/></svg>';
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', () => locate(true));
      return btn;
    };
    control.addTo(map);

    // Auto-centrar al abrir si el permiso ya está concedido (sin molestar con prompt)
    navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((p) => {
        if (p.state === 'granted') locate(false);
      })
      .catch(() => {});

    return () => {
      map.off('locationfound', onFound);
      map.off('locationerror', onError);
      control.remove();
    };
  }, [map]);

  if (!pos) return null;

  return (
    <>
      <Circle
        center={pos.latlng}
        radius={pos.accuracy}
        pathOptions={{ color: '#1a73e8', fillColor: '#1a73e8', fillOpacity: 0.12, weight: 1 }}
      />
      <Marker position={pos.latlng} icon={userDotIcon()} />
    </>
  );
}
