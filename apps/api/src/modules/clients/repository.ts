import { db } from '../../db/connection.js';
import { clients, operations } from '../../db/schema.js';
import { and, desc, eq, gte, ilike, isNotNull, or, sql } from 'drizzle-orm';

export interface ClientInput {
  nombre: string;
  telefono?: string;
  direccion?: string;
  notas?: string;
}

export async function listClients(query?: string) {
  const searchCondition = query
    ? or(ilike(clients.nombre, `%${query}%`), ilike(clients.telefono, `%${query}%`))
    : undefined;

  return db
    .select({
      id: clients.id,
      nombre: clients.nombre,
      telefono: clients.telefono,
      direccion: clients.direccion,
      notas: clients.notas,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt,
      operationsCount: sql<number>`count(${operations.id})::int`,
      lastOperationAt: sql<string | null>`max(${operations.createdAt})`,
    })
    .from(clients)
    .leftJoin(operations, eq(operations.clientId, clients.id))
    .where(searchCondition)
    .groupBy(clients.id)
    .orderBy(desc(clients.createdAt));
}

export async function findClientById(id: string) {
  return db.query.clients.findFirst({ where: eq(clients.id, id) });
}

export async function createClient(data: ClientInput, createdById: string) {
  const [client] = await db.insert(clients).values({ ...data, createdById }).returning();
  return client;
}

export async function updateClient(id: string, data: Partial<ClientInput>) {
  const [client] = await db
    .update(clients)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(clients.id, id))
    .returning();
  return client;
}

/**
 * Estadísticas para la pestaña Clientes: total registrados, cuántos
 * operaron hoy y cuántos se dieron de alta este mes.
 */
export async function getClientsStats() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(clients);

  const [{ nuevosEsteMes }] = await db
    .select({ nuevosEsteMes: sql<number>`count(*)::int` })
    .from(clients)
    .where(gte(clients.createdAt, startOfMonth));

  const [{ operaronHoy }] = await db
    .select({ operaronHoy: sql<number>`count(distinct ${operations.clientId})::int` })
    .from(operations)
    .where(and(gte(operations.createdAt, startOfToday), isNotNull(operations.clientId)));

  return { total, nuevosEsteMes, operaronHoy };
}
