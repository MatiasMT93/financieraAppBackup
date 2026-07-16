import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import { showLocalNotification } from '../services/notifications';
import type { Operation } from '@cambioapp/shared-types';

export function useOperation(cadeteId: string | null) {
  const [operation, setOperation] = useState<Operation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOperation = useCallback(async () => {
    if (!cadeteId) return;
    try {
      const ops = await apiGet<Operation[]>(`/operations?cadeteId=${cadeteId}`);
      const active = ops.find(
        (op) => !['cerrada', 'cancelada'].includes(op.status),
      );
      setOperation(active ?? null);
    } catch (e) {
      setError('No se pudo cargar la operación');
    } finally {
      setLoading(false);
    }
  }, [cadeteId]);

  useEffect(() => {
    fetchOperation();
  }, [fetchOperation]);

  useEffect(() => {
    if (!cadeteId) return;

    let mounted = true;
    (async () => {
      await connectSocket();
      const s = await getSocket();

      s.on('operation:assigned', (data: { operation: Operation; cadeteId: string }) => {
        if (!mounted || data.cadeteId !== cadeteId) return;
        setOperation(data.operation);
        showLocalNotification('Nueva operación asignada', `📍 ${data.operation.direccion}`);
      });

      s.on('operation:updated', (data: { operation: Operation }) => {
        if (!mounted || data.operation.cadeteId !== cadeteId) return;
        setOperation(data.operation);
      });
    })();

    return () => { mounted = false; };
  }, [cadeteId]);

  async function transition(newStatus: string): Promise<void> {
    if (!operation) return;
    try {
      const updated = await apiPost<Operation>(`/operations/${operation.id}/transition`, { newStatus });
      setOperation(updated);
    } catch (e: any) {
      throw new Error(e?.response?.data?.error ?? 'Error al cambiar estado');
    }
  }

  async function modifyAmount(monto: number): Promise<void> {
    if (!operation) return;
    try {
      const updated = await apiPost<Operation>(`/operations/${operation.id}/modify-amount`, { monto });
      setOperation(updated);
    } catch (e: any) {
      throw new Error(e?.response?.data?.error ?? 'Error al modificar monto');
    }
  }

  async function reportIncident(descripcion: string): Promise<void> {
    if (!operation) return;
    try {
      await apiPost('/incidents', { operationId: operation.id, descripcion });
      await fetchOperation();
    } catch (e: any) {
      throw new Error(e?.response?.data?.error ?? 'Error al reportar incidencia');
    }
  }

  return { operation, loading, error, transition, modifyAmount, reportIncident, refetch: fetchOperation };
}
