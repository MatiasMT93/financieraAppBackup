import { VALID_TRANSITIONS, EDITABLE_STATUSES, CANCELLABLE_STATUSES } from '@cambioapp/shared-constants';
import type { OperationStatus } from '@cambioapp/shared-types';
import { eq } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { operations, operationStatusHistory, amountCorrections } from '../../db/schema.js';
import * as repo from './repository.js';
import type { AuthUser } from '../../middleware/auth.js';
import { broadcast, emitToUser } from '../../realtime/socket.js';

export async function listOperations(filters: {
  status?: OperationStatus | OperationStatus[];
  cadeteId?: string;
  date?: string;
}) {
  return repo.listOperations(filters);
}

export async function getOperation(id: string) {
  const op = await repo.findOperationById(id);
  if (!op) throw new Error('Operación no encontrada');
  return op;
}

export async function createOperation(
  data: {
    tipo: 'entrega' | 'retiro' | 'entrega_retiro';
    moneda: 'ARS' | 'USD' | 'EUR' | 'BRL' | 'USDT';
    monto: number;
    moneda2?: 'ARS' | 'USD' | 'EUR' | 'BRL' | 'USDT';
    monto2?: number;
    direccion: string;
    contacto: string;
    telefono?: string;
    notas?: string;
  },
  user: AuthUser,
) {
  const op = await repo.createOperation({ ...data, administrativoId: user.id });
  const full = await repo.findOperationById(op.id);
  broadcast('operation:created', { operation: full });
  return full;
}

export async function updateOperation(
  id: string,
  data: Parameters<typeof repo.updateOperation>[1],
  user: AuthUser,
) {
  const op = await repo.findOperationById(id);
  if (!op) throw new Error('Operación no encontrada');
  if (!EDITABLE_STATUSES.includes(op.status as OperationStatus)) {
    throw new Error('La operación no puede ser editada en su estado actual');
  }
  const updated = await repo.updateOperation(id, data);
  broadcast('operation:updated', { operation: updated });
  return updated;
}

export async function cancelOperation(id: string, user: AuthUser) {
  const op = await repo.findOperationById(id);
  if (!op) throw new Error('Operación no encontrada');
  if (!CANCELLABLE_STATUSES.includes(op.status as OperationStatus)) {
    throw new Error('La operación no puede ser cancelada — el cadete ya salió');
  }

  const fromStatus = op.status as OperationStatus;
  await db.transaction(async (tx) => {
    await tx.update(operations)
      .set({ status: 'cancelada', updatedAt: new Date() })
      .where(eq(operations.id, id));
    await tx.insert(operationStatusHistory).values({
      operationId: id,
      fromStatus,
      toStatus: 'cancelada',
      changedById: user.id,
    });
    if (op.cadeteId) await repo.recomputeCadeteStatus(tx, op.cadeteId);
  });

  const updated = await repo.findOperationById(id);
  broadcast('operation:updated', { operation: updated });
  return updated;
}

export async function assignCadete(id: string, cadeteId: string, user: AuthUser) {
  const op = await repo.findOperationById(id);
  if (!op) throw new Error('Operación no encontrada');
  if (op.status !== 'pendiente' && op.status !== 'asignada') {
    throw new Error('Solo se puede asignar cadete a operaciones pendientes o asignadas');
  }

  const previousCadeteId = op.cadeteId;
  const fromStatus = op.status as OperationStatus;

  await db.transaction(async (tx) => {
    await tx.update(operations)
      .set({ cadeteId, coordinadorId: user.id, status: 'asignada', updatedAt: new Date() })
      .where(eq(operations.id, id));
    await tx.insert(operationStatusHistory).values({
      operationId: id,
      fromStatus,
      toStatus: 'asignada',
      changedById: user.id,
    });
    // La operación ya apunta al nuevo cadete: recalcular ambos refleja sus
    // operaciones reales (el anterior puede tener otras en curso).
    await repo.recomputeCadeteStatus(tx, cadeteId);
    if (previousCadeteId && previousCadeteId !== cadeteId) {
      await repo.recomputeCadeteStatus(tx, previousCadeteId);
    }
  });

  const updated = await repo.findOperationById(id);
  broadcast('operation:assigned', { operation: updated, cadeteId });
  emitToUser(cadeteId, 'operation:assigned', { operation: updated, cadeteId });
  return updated;
}

export async function unassignCadete(id: string, user: AuthUser) {
  const op = await repo.findOperationById(id);
  if (!op) throw new Error('Operación no encontrada');
  if (op.status !== 'asignada') {
    throw new Error('Solo se puede desasignar una operación asignada');
  }

  const previousCadeteId = op.cadeteId;

  await db.transaction(async (tx) => {
    await tx.update(operations)
      .set({ cadeteId: null, coordinadorId: null, status: 'pendiente', updatedAt: new Date() })
      .where(eq(operations.id, id));
    await tx.insert(operationStatusHistory).values({
      operationId: id,
      fromStatus: 'asignada',
      toStatus: 'pendiente',
      changedById: user.id,
    });
    if (previousCadeteId) await repo.recomputeCadeteStatus(tx, previousCadeteId);
  });

  const updated = await repo.findOperationById(id);
  broadcast('operation:updated', { operation: updated });
  return updated;
}

export async function transitionStatus(id: string, newStatus: OperationStatus, user: AuthUser) {
  const op = await repo.findOperationById(id);
  if (!op) throw new Error('Operación no encontrada');

  const currentStatus = op.status as OperationStatus;
  const validNext = VALID_TRANSITIONS[currentStatus];

  if (!validNext.includes(newStatus)) {
    throw new Error(
      `Transición inválida: ${currentStatus} → ${newStatus}. Permitidas: ${validNext.join(', ')}`,
    );
  }

  if (user.role === 'cadete' && op.cadeteId !== user.id) {
    throw new Error('Solo podés cambiar el estado de tus propias operaciones');
  }

  const cadeteId = op.cadeteId;

  await db.transaction(async (tx) => {
    await tx.update(operations)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(operations.id, id));
    await tx.insert(operationStatusHistory).values({
      operationId: id,
      fromStatus: currentStatus,
      toStatus: newStatus,
      changedById: user.id,
    });
    if (cadeteId) await repo.recomputeCadeteStatus(tx, cadeteId);
  });

  const updated = await repo.findOperationById(id);
  broadcast('operation:updated', { operation: updated });
  return updated;
}

export async function modifyAmount(id: string, monto: number, user: AuthUser) {
  const op = await repo.findOperationById(id);
  if (!op) throw new Error('Operación no encontrada');

  const closedStatuses: OperationStatus[] = ['cerrada', 'cancelada'];
  if (closedStatuses.includes(op.status as OperationStatus)) {
    throw new Error('No se puede modificar el monto de una operación cerrada o cancelada');
  }

  if (user.role === 'cadete' && op.cadeteId !== user.id) {
    throw new Error('Solo podés modificar el monto de tus propias operaciones');
  }

  await db.transaction(async (tx) => {
    await tx.insert(amountCorrections).values({
      operationId: id,
      cadeteId: user.id,
      montoAnterior: String(parseFloat(String(op.monto))),
      montoNuevo: String(monto),
    });
    await tx.update(operations)
      .set({ monto: String(monto), updatedAt: new Date() })
      .where(eq(operations.id, id));
  });

  const updated = await repo.findOperationById(id);
  broadcast('operation:updated', { operation: updated });
  return updated;
}
