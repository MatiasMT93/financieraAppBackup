import { db } from '../../db/connection.js';
import { contacts, operationContacts } from '../../db/schema.js';
import { eq, and, sql, like, or } from 'drizzle-orm';
import { normalizeAddress } from '../../utils/normalize.js';

export async function suggestContactsByQuery(query: string, limit = 5) {
  const queryNorm = normalizeAddress(query);
  const queryLower = query.trim().toLowerCase();
  if (!queryNorm) return [];
  return db.query.contacts.findMany({
    where: or(
      like(contacts.direccionNormalizada, `%${queryNorm}%`),
      sql`lower(${contacts.nombre}) LIKE ${`%${queryLower}%`}`,
    ),
    orderBy: (t, { desc }) => [desc(t.usosCount)],
    limit,
  });
}

export async function findOrCreateContact(data: {
  nombre: string;
  telefono?: string;
  direccion: string;
  email?: string;
  notas?: string;
}) {
  const direccionNormalizada = normalizeAddress(data.direccion);
  const nombreNormalizado = data.nombre.trim().toLowerCase();

  const existing = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.direccionNormalizada, direccionNormalizada),
      sql`lower(${contacts.nombre}) = ${nombreNormalizado}`,
    ),
  });

  if (existing) {
    await db
      .update(contacts)
      .set({
        usosCount: existing.usosCount + 1,
        telefono: data.telefono ?? existing.telefono,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, existing.id));
    return existing;
  }

  const [created] = await db
    .insert(contacts)
    .values({ ...data, direccionNormalizada })
    .returning();
  return created;
}

export async function linkContactToOperation(operationId: string, contactId: string) {
  await db
    .insert(operationContacts)
    .values({ operationId, contactId })
    .onConflictDoNothing();
}
