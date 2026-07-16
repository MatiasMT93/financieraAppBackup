import { db } from '../../db/connection.js';
import { operations, operationStatusHistory, amountCorrections } from '../../db/schema.js';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import type { OperationStatus } from '@cambioapp/shared-types';

export async function findOperationById(id: string) {
  return db.query.operations.findFirst({
    where: eq(operations.id, id),
    with: {
      administrativo: { columns: { id: true, nombre: true } },
      cadete: { columns: { id: true, nombre: true, celular: true } },
    },
  });
}

export async function listOperations(filters: {
  status?: OperationStatus | OperationStatus[];
  cadeteId?: string;
  date?: string;
}) {
  const conditions = [];
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    if (statuses.length === 1) {
      conditions.push(eq(operations.status, statuses[0]));
    } else if (statuses.length > 1) {
      conditions.push(inArray(operations.status, statuses));
    }
  }
  if (filters.cadeteId) conditions.push(eq(operations.cadeteId, filters.cadeteId));
  if (filters.date) {
    // Interpret date in Buenos Aires timezone (UTC-3, no DST)
    const start = new Date(`${filters.date}T00:00:00-03:00`);
    const end = new Date(`${filters.date}T23:59:59.999-03:00`);
    conditions.push(gte(operations.createdAt, start));
    conditions.push(lte(operations.createdAt, end));
  }

  return db.query.operations.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      administrativo: { columns: { id: true, nombre: true } },
      cadete: { columns: { id: true, nombre: true, celular: true } },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

export async function createOperation(data: {
  tipo: 'entrega' | 'retiro';
  moneda: 'ARS' | 'USD' | 'EUR' | 'BRL';
  monto: number;
  direccion: string;
  contacto: string;
  telefono?: string;
  notas?: string;
  administrativoId: string;
}) {
  const [op] = await db.insert(operations).values({ ...data, monto: String(data.monto) }).returning();
  return op;
}

export async function updateOperation(id: string, data: Partial<{
  tipo: 'entrega' | 'retiro';
  moneda: 'ARS' | 'USD' | 'EUR' | 'BRL';
  monto: number;
  direccion: string;
  contacto: string;
  telefono: string;
  notas: string;
}>) {
  const values: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.monto !== undefined) values.monto = String(data.monto);
  const [op] = await db.update(operations).set(values).where(eq(operations.id, id)).returning();
  return op;
}

export async function updateOperationStatus(
  id: string,
  status: OperationStatus,
  changedById: string,
  fromStatus: OperationStatus,
) {
  await db
    .update(operations)
    .set({ status, updatedAt: new Date() })
    .where(eq(operations.id, id));

  await db.insert(operationStatusHistory).values({
    operationId: id,
    fromStatus,
    toStatus: status,
    changedById,
  });

  return findOperationById(id);
}

export async function assignCadete(
  id: string,
  cadeteId: string,
  coordinadorId: string,
  fromStatus: OperationStatus = 'pendiente',
) {
  await db
    .update(operations)
    .set({ cadeteId, coordinadorId, status: 'asignada', updatedAt: new Date() })
    .where(eq(operations.id, id));

  await db.insert(operationStatusHistory).values({
    operationId: id,
    fromStatus,
    toStatus: 'asignada',
    changedById: coordinadorId,
  });

  return findOperationById(id);
}

export async function unassignCadete(id: string, coordinadorId: string) {
  await db
    .update(operations)
    .set({ cadeteId: null, coordinadorId: null, status: 'pendiente', updatedAt: new Date() })
    .where(eq(operations.id, id));

  await db.insert(operationStatusHistory).values({
    operationId: id,
    fromStatus: 'asignada',
    toStatus: 'pendiente',
    changedById: coordinadorId,
  });

  return findOperationById(id);
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Recalcula users.cadete_status a partir de las operaciones ACTIVAS del cadete,
 * en una sola sentencia atómica. Es la forma robusta de mantener el estado
 * denormalizado: si el cadete tiene varias operaciones, toma la más relevante
 * (incidencia > en_destino > volviendo > en_camino > asignada); si no tiene
 * ninguna activa, queda 'disponible'. Evita el bug de "última escritura gana"
 * donde cerrar/cancelar una operación dejaba al cadete en 'disponible' aunque
 * tuviera otra en curso. Debe llamarse después de modificar la operación.
 */
export async function recomputeCadeteStatus(tx: Tx, cadeteId: string): Promise<void> {
  await tx.execute(sql`
    UPDATE users
    SET cadete_status = COALESCE(
      (
        SELECT o.status::text::cadete_status
        FROM operations o
        WHERE o.cadete_id = ${cadeteId}
          AND o.status IN ('asignada', 'en_camino', 'en_destino', 'volviendo', 'incidencia')
        ORDER BY
          CASE o.status
            WHEN 'incidencia' THEN 5
            WHEN 'en_destino' THEN 4
            WHEN 'volviendo'  THEN 3
            WHEN 'en_camino'  THEN 2
            WHEN 'asignada'   THEN 1
            ELSE 0
          END DESC,
          o.updated_at DESC
        LIMIT 1
      ),
      'disponible'::cadete_status
    ),
    updated_at = now()
    WHERE id = ${cadeteId}
  `);
}

/**
 * Repara operaciones que quedaron en mal estado por el bug viejo de incidencias.
 * Cancela dos clases de operaciones zombi y recomputa cadete_status:
 *
 *  1. status='incidencia' pero todas las incidencias están resueltas (bug
 *     original: resolveIncident solo tocaba la tabla incidents).
 *
 *  2. operaciones que el script viejo de reparación reanimó devolviéndolas
 *     a su estado pre-incidencia: el último cambio en el historial tiene
 *     from_status='incidencia' y la operación sigue exactamente en ese
 *     to_status sin avanzar. Eso es una operación que el cadete nunca llegó
 *     a terminar y que la reparación previa devolvió a la vida.
 *
 * Es idempotente: si no hay nada que arreglar, no hace nada.
 */
export async function repairZombieIncidents(): Promise<number> {
  const result = await db.execute(sql`
    WITH last_event AS (
      SELECT DISTINCT ON (operation_id)
        operation_id, from_status, to_status, changed_by_id, created_at
      FROM operation_status_history
      ORDER BY operation_id, created_at DESC
    ),
    to_cancel AS (
      SELECT o.id, o.cadete_id, o.status AS current_status, le.changed_by_id
      FROM operations o
      LEFT JOIN last_event le ON le.operation_id = o.id
      WHERE o.status NOT IN ('cerrada', 'cancelada')
        AND (
          -- Caso 1: pegada en 'incidencia' con incidencia resuelta
          (
            o.status = 'incidencia'
            AND NOT EXISTS (
              SELECT 1 FROM incidents i
              WHERE i.operation_id = o.id AND i.is_resolved = false
            )
          )
          OR
          -- Caso 2: reanimada por el script viejo, sin avance desde entonces
          (
            le.from_status = 'incidencia'
            AND o.status = le.to_status
          )
        )
    ),
    history_insert AS (
      INSERT INTO operation_status_history (operation_id, from_status, to_status, changed_by_id)
      SELECT
        tc.id,
        tc.current_status,
        'cancelada'::operation_status,
        COALESCE(tc.changed_by_id, (SELECT id FROM users WHERE role = 'coordinador' LIMIT 1))
      FROM to_cancel tc
      WHERE COALESCE(tc.changed_by_id, (SELECT id FROM users WHERE role = 'coordinador' LIMIT 1)) IS NOT NULL
      RETURNING operation_id
    ),
    cancelled AS (
      UPDATE operations o
      SET status = 'cancelada', updated_at = now()
      FROM to_cancel tc
      WHERE o.id = tc.id
      RETURNING o.id, o.cadete_id
    )
    SELECT COUNT(*)::int AS repaired,
           array_agg(DISTINCT cadete_id) FILTER (WHERE cadete_id IS NOT NULL) AS cadete_ids
    FROM cancelled
  `);

  const row = (result.rows as Array<{ repaired: number; cadete_ids: string[] | null }>)[0];
  const repaired = row?.repaired ?? 0;
  const cadeteIds = row?.cadete_ids ?? [];

  if (repaired > 0 && cadeteIds.length > 0) {
    await db.transaction(async (tx) => {
      for (const cadeteId of cadeteIds) {
        await recomputeCadeteStatus(tx, cadeteId);
      }
    });
  }

  return repaired;
}

export async function saveAmountCorrection(data: {
  operationId: string;
  cadeteId: string;
  montoAnterior: number;
  montoNuevo: number;
}) {
  await db.insert(amountCorrections).values({
    ...data,
    montoAnterior: String(data.montoAnterior),
    montoNuevo: String(data.montoNuevo),
  });
}

export async function getActiveOperationsForOwner(period: 'today' | 'week' | 'month') {
  const now = new Date();
  const start = new Date();
  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    start.setDate(now.getDate() - 7);
  } else {
    start.setMonth(now.getMonth() - 1);
  }

  return db.query.operations.findMany({
    where: and(eq(operations.status, 'cerrada'), gte(operations.updatedAt, start)),
  });
}

export async function getCashInStreet() {
  return db.query.operations.findMany({
    where: sql`${operations.status} IN ('asignada', 'en_camino', 'en_destino', 'volviendo')`,
  });
}
