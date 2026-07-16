import { db } from '../../db/connection.js';
import { users, refreshTokens } from '../../db/schema.js';
import { sql, and, gt, isNull, eq } from 'drizzle-orm';

export async function createPendingUser(data: {
  usuario: string;
  nombre: string;
  apellido: string;
  celular: string;
  passwordHash: string;
}) {
  const [user] = await db
    .insert(users)
    .values({ ...data, role: 'cadete', pendingApproval: true, isActive: true })
    .returning();
  return user;
}

export async function findUserByUsuario(usuario: string) {
  return db.query.users.findFirst({
    where: sql`lower(${users.usuario}) = ${usuario.toLowerCase()}`,
  });
}

export async function findUserById(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

export async function saveRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });
}

export async function findValidRefreshToken(tokenHash: string) {
  return db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.tokenHash, tokenHash),
      gt(refreshTokens.expiresAt, new Date()),
      isNull(refreshTokens.revokedAt),
    ),
  });
}

export async function revokeRefreshToken(id: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, id));
}

export async function revokeAllUserRefreshTokens(userId: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}
