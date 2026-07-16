import { db } from '../../db/connection.js';
import { incidents } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export async function createIncident(data: {
  operationId: string;
  cadeteId: string;
  descripcion: string;
}) {
  const [inc] = await db.insert(incidents).values(data).returning();
  return inc;
}

export async function findIncidentById(id: string) {
  return db.query.incidents.findFirst({
    where: eq(incidents.id, id),
    with: {
      cadete: { columns: { id: true, nombre: true } },
      operation: { columns: { id: true, direccion: true, monto: true, moneda: true } },
    },
  });
}

export async function listActiveIncidents() {
  return db.query.incidents.findMany({
    where: eq(incidents.isResolved, false),
    with: {
      cadete: { columns: { id: true, nombre: true } },
      operation: { columns: { id: true, direccion: true, monto: true, moneda: true } },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

export async function listResolvedIncidents() {
  return db.query.incidents.findMany({
    where: eq(incidents.isResolved, true),
    with: {
      cadete: { columns: { id: true, nombre: true } },
      operation: { columns: { id: true, direccion: true, monto: true, moneda: true } },
    },
    orderBy: (t, { desc }) => [desc(t.resolvedAt)],
  });
}

export async function resolveIncident(id: string, resolvedBy: string) {
  const [inc] = await db
    .update(incidents)
    .set({ isResolved: true, resolvedBy, resolvedAt: new Date() })
    .where(eq(incidents.id, id))
    .returning();
  return inc;
}
