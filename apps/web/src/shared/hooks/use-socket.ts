import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, getSocket, disconnectSocket } from '../api/socket.ts';

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    connectSocket();
    const s = getSocket();

    const invalidateOps = () => queryClient.invalidateQueries({ queryKey: ['operations'] });
    const invalidateIncidents = () => queryClient.invalidateQueries({ queryKey: ['incidents'] });
    const invalidateCadetes = () => queryClient.invalidateQueries({ queryKey: ['cadetes'] });
    const invalidateLocations = () => queryClient.invalidateQueries({ queryKey: ['locations'] });

    // Los cambios de estado pueden hacer que un cadete empiece o deje de
    // compartir ubicación, así que también refrescamos el mapa (locations).
    const onIncidentCreated = () => { invalidateOps(); invalidateIncidents(); invalidateCadetes(); invalidateLocations(); };
    const onOperationAssigned = () => { invalidateOps(); invalidateCadetes(); invalidateLocations(); };
    const onOperationUpdated = () => { invalidateOps(); invalidateCadetes(); invalidateLocations(); };
    // Resolver/cancelar una incidencia también cambia el estado de la operación
    // y del cadete, así que hay que refrescar todo igual que al crearla.
    const onIncidentResolved = () => { invalidateOps(); invalidateIncidents(); invalidateCadetes(); invalidateLocations(); };

    const invalidatePendingCadetes = () => queryClient.invalidateQueries({ queryKey: ['cadetes-pending'] });

    s.on('operation:created', invalidateOps);
    s.on('operation:updated', onOperationUpdated);
    s.on('operation:assigned', onOperationAssigned);
    s.on('incident:created', onIncidentCreated);
    s.on('incident:resolved', onIncidentResolved);
    s.on('cadete:pending_registration', invalidatePendingCadetes);
    // NOTA: 'location:updated' NO invalida el query de locations. Las posiciones
    // en vivo se manejan por socket en MapaTab (movimiento fluido), evitando un
    // refetch por cada actualización de cada cadete.

    return () => {
      s.off('operation:created', invalidateOps);
      s.off('operation:updated', onOperationUpdated);
      s.off('operation:assigned', onOperationAssigned);
      s.off('incident:created', onIncidentCreated);
      s.off('incident:resolved', onIncidentResolved);
      s.off('cadete:pending_registration', invalidatePendingCadetes);
      disconnectSocket();
    };
  }, [queryClient]);
}
