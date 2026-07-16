import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { incidents, operations, operationStatusHistory } from '../../db/schema.js';
import type { OperationStatus } from '@cambioapp/shared-types';
import * as repo from './repository.js';
import { findOperationById, recomputeCadeteStatus } from '../operations/repository.js';
import type { AuthUser } from '../../middleware/auth.js';
import { broadcast } from '../../realtime/socket.js';

export async function listIncidents() {
  const [active, resolved] = await Promise.all([
    repo.listActiveIncidents(),
    repo.listResolvedIncidents(),
  ]);
  return { active, resolved };
}

export async function createIncident(
  data: { operationId: string; descripcion: string },
  user: AuthUser,
) {
  const op = await findOperationById(data.operationId);
  if (!op) throw new Error('Operación no encontrada');
  if (op.cadeteId !== user.id) throw new Error('Solo podés reportar incidencias de tus operaciones');

  const fromStatus = op.status as any;

  const incidentId = await db.transaction(async (tx) => {
    const [incident] = await tx.insert(incidents).values({
      operationId: data.operationId,
      cadeteId: user.id,
      descripcion: data.descripcion,
    }).returning({ id: incidents.id });

    await tx.update(operations)
      .set({ status: 'incidencia', updatedAt: new Date() })
      .where(eq(operations.id, data.operationId));

    await tx.insert(operationStatusHistory).values({
      operationId: data.operationId,
      fromStatus,
      toStatus: 'incidencia',
      changedById: user.id,
    });

    await recomputeCadeteStatus(tx, user.id);

    return incident.id;
  });

  const [full, fullOp] = await Promise.all([
    repo.findIncidentById(incidentId),
    findOperationById(data.operationId),
  ]);

  broadcast('incident:created', { incident: full });
  broadcast('operation:updated', { operation: fullOp });
  return full;
}

export async function resolveIncident(
  id: string,
  user: AuthUser,
  action: 'resume' | 'cancel' = 'resume',
) {
  const incident = await repo.findIncidentById(id);
  if (!incident) throw new Error('Incidencia no encontrada');
  if (incident.isResolved) throw new Error('La incidencia ya está resuelta');

  const op = await findOperationById(incident.operationId);
  if (!op) throw new Error('Operación no encontrada');

  // Buscamos el estado previo a la incidencia mirando el historial: la última
  // transición a 'incidencia' nos dice de qué estado venía la operación. Si por
  // algún motivo no hay registro (no debería pasar) caemos a 'en_camino' como
  // valor seguro para que el cadete pueda terminarla.
  const [lastTransition] = await db
    .select({ fromStatus: operationStatusHistory.fromStatus })
    .from(operationStatusHistory)
    .where(and(
      eq(operationStatusHistory.operationId, incident.operationId),
      eq(operationStatusHistory.toStatus, 'incidencia'),
    ))
    .orderBy(desc(operationStatusHistory.createdAt))
    .limit(1);

  const previousStatus: OperationStatus =
    (lastTransition?.fromStatus as OperationStatus | null) ?? 'en_camino';
  const newStatus: OperationStatus = action === 'cancel' ? 'cancelada' : previousStatus;

  await db.transaction(async (tx) => {
    await tx.update(incidents)
      .set({ isResolved: true, resolvedBy: user.id, resolvedAt: new Date() })
      .where(eq(incidents.id, id));

    // Solo movemos la operación si efectivamente está en 'incidencia'. El cadete
    // podría haberla cerrado antes (no debería poder, pero por las dudas) — en
    // ese caso respetamos su estado actual y no lo pisamos.
    if (op.status === 'incidencia') {
      await tx.update(operations)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(operations.id, incident.operationId));

      await tx.insert(operationStatusHistory).values({
        operationId: incident.operationId,
        fromStatus: 'incidencia',
        toStatus: newStatus,
        changedById: user.id,
      });
    }

    if (op.cadeteId) {
      await recomputeCadeteStatus(tx, op.cadeteId);
    }
  });

  const [resolved, fullOp] = await Promise.all([
    repo.findIncidentById(id),
    findOperationById(incident.operationId),
  ]);

  broadcast('incident:resolved', { incident: resolved });
  broadcast('operation:updated', { operation: fullOp });
  return resolved;
}
