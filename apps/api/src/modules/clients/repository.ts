import { db } from '../../db/connection.js';
import { clients, operations } from '../../db/schema.js';
import { and, count, desc, eq, gte, isNotNull, max, ne, sql } from 'drizzle-orm';

// Una operación cancelada no cuenta como actividad real del cliente.
const notCancelled = ne(operations.status, 'cancelada');

export interface ClientInput {
  nombre: string;
  telefono?: string;
  direccion?: string;
  notas?: string;
}

export async function listClients(query?: string) {
  // unaccent() para que la búsqueda ignore acentos (requiere la extensión
  // `unaccent`, habilitada en la migración 0008). Por nombre o dirección,
  // no por teléfono.
  const searchCondition = query
    ? sql`(unaccent(${clients.nombre}) ilike unaccent(${`%${query}%`}) or unaccent(coalesce(${clients.direccion}, '')) ilike unaccent(${`%${query}%`}))`
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
      // Usamos el helper max() de drizzle (no sql`` crudo) para que el valor
      // pase por el mapeo de la columna y quede forzado a UTC (+0000) al
      // convertirlo a Date; si no, el parser default de `pg` para timestamp
      // sin timezone usa la hora local del proceso del servidor y el dato
      // llega desfasado (ej. "dentro de 3 horas" en vez de "hace 3 horas").
      lastOperationAt: max(operations.createdAt),
    })
    .from(clients)
    // La condición de "no cancelada" va en el ON, no en el WHERE: así un
    // cliente sin operaciones válidas (o con todas canceladas) sigue
    // apareciendo en la lista con 0, en vez de desaparecer por el LEFT JOIN.
    .leftJoin(operations, and(eq(operations.clientId, clients.id), notCancelled))
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
 * Un cliente con operaciones asociadas no se puede borrar (la FK lo
 * impide): se lo verifica antes para poder avisar con un mensaje claro
 * en vez de que la ruta reviente con un error de Postgres.
 */
export async function countClientOperations(id: string): Promise<number> {
  const [row] = await db.select({ total: count() }).from(operations).where(eq(operations.clientId, id));
  return row?.total ?? 0;
}

export async function deleteClient(id: string) {
  const [deleted] = await db.delete(clients).where(eq(clients.id, id)).returning({ id: clients.id });
  return deleted;
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
    .where(and(gte(operations.createdAt, startOfToday), isNotNull(operations.clientId), notCancelled));

  return { total, nuevosEsteMes, operaronHoy };
}
