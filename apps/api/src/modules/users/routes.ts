import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { db } from '../../db/connection.js';
import { users } from '../../db/schema.js';
import { sql, eq, and } from 'drizzle-orm';
import { BCRYPT_SALT_ROUNDS } from '@cambioapp/shared-constants';
import { revokeAllUserRefreshTokens } from '../auth/repository.js';

const router = Router();

router.use(authenticate);

// Para `db.query.users.findMany({ columns: USER_COLS })` (flags booleanos)
const USER_COLS = {
  id: true,
  usuario: true,
  nombre: true,
  apellido: true,
  celular: true,
  role: true,
  cadeteStatus: true,
  isActive: true,
  pendingApproval: true,
  createdAt: true,
} as const;

// Para `.returning(USER_RETURNING)` (referencias a columnas reales)
const USER_RETURNING = {
  id: users.id,
  usuario: users.usuario,
  nombre: users.nombre,
  apellido: users.apellido,
  celular: users.celular,
  role: users.role,
  cadeteStatus: users.cadeteStatus,
  isActive: users.isActive,
  pendingApproval: users.pendingApproval,
  createdAt: users.createdAt,
} as const;

router.get('/', requireRoles('coordinador', 'administrativo', 'dueno'), async (req, res) => {
  const schema = z.object({ role: z.enum(['cadete', 'coordinador', 'administrativo', 'dueno']).optional() });
  const { role } = schema.parse(req.query);

  const list = await db.query.users.findMany({
    where: and(eq(users.isActive, true), eq(users.pendingApproval, false), role ? eq(users.role, role) : undefined),
    columns: USER_COLS,
  });

  res.json({ ok: true, data: list });
});

/** Lista cadetes pendientes de aprobación */
router.get('/pending', requireRoles('coordinador', 'dueno'), async (req, res) => {
  const list = await db.query.users.findMany({
    where: and(eq(users.role, 'cadete'), eq(users.pendingApproval, true)),
    columns: USER_COLS,
  });
  res.json({ ok: true, data: list });
});

router.post('/', requireRoles('coordinador', 'dueno'), async (req, res) => {
  const schema = z.object({
    usuario: z.string().min(2).max(100),
    nombre: z.string().min(2).max(100).optional(),
    password: z.string().min(6),
    role: z.enum(['cadete']),
  });
  const { usuario, nombre, password, role } = schema.parse(req.body);

  const usuarioNorm = usuario.trim().toLowerCase();
  const existing = await db.query.users.findFirst({
    where: sql`lower(${users.usuario}) = ${usuarioNorm}`,
  });
  if (existing) {
    res.status(409).json({ ok: false, error: 'Ya existe un usuario con ese nombre de usuario' });
    return;
  }

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const displayNombre = nombre ? capitalize(nombre.trim()) : capitalize(usuario.trim());

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const [user] = await db
    .insert(users)
    .values({ usuario: usuarioNorm, nombre: displayNombre, passwordHash, role })
    .returning(USER_RETURNING);

  res.status(201).json({ ok: true, data: user });
});

/** Aprobar un cadete pendiente */
router.post('/:id/approve', requireRoles('coordinador', 'dueno'), async (req, res) => {
  const target = await db.query.users.findFirst({ where: eq(users.id, req.params.id) });
  if (!target || target.role !== 'cadete' || !target.pendingApproval) {
    res.status(404).json({ ok: false, error: 'Cadete pendiente no encontrado' });
    return;
  }

  const [updated] = await db
    .update(users)
    .set({ pendingApproval: false, updatedAt: new Date() })
    .where(eq(users.id, req.params.id))
    .returning(USER_RETURNING);

  res.json({ ok: true, data: updated });
});

/** Rechazar y eliminar un cadete pendiente */
router.post('/:id/reject', requireRoles('coordinador', 'dueno'), async (req, res) => {
  const target = await db.query.users.findFirst({ where: eq(users.id, req.params.id) });
  if (!target || target.role !== 'cadete' || !target.pendingApproval) {
    res.status(404).json({ ok: false, error: 'Cadete pendiente no encontrado' });
    return;
  }

  await db.delete(users).where(eq(users.id, req.params.id));
  res.json({ ok: true });
});

router.patch('/:id', requireRoles('coordinador', 'dueno'), async (req, res) => {
  const schema = z.object({
    nombre: z.string().min(2).max(100).optional(),
    password: z.string().min(6).optional(),
  });
  const { nombre, password } = schema.parse(req.body);

  const target = await db.query.users.findFirst({ where: eq(users.id, req.params.id) });
  if (!target || target.role !== 'cadete') {
    res.status(404).json({ ok: false, error: 'Cadete no encontrado' });
    return;
  }

  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (nombre) values.nombre = nombre;
  if (password) values.passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const [updated] = await db
    .update(users)
    .set(values)
    .where(eq(users.id, req.params.id))
    .returning(USER_RETURNING);

  // Si se cambió la contraseña, invalidar todas las sesiones existentes para
  // que el usuario tenga que volver a iniciar sesión con la nueva.
  if (password) await revokeAllUserRefreshTokens(req.params.id);

  res.json({ ok: true, data: updated });
});

router.delete('/:id', requireRoles('coordinador', 'dueno'), async (req, res) => {
  const target = await db.query.users.findFirst({ where: eq(users.id, req.params.id) });
  if (!target || target.role !== 'cadete') {
    res.status(404).json({ ok: false, error: 'Cadete no encontrado' });
    return;
  }

  await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, req.params.id));
  // Cortar sus sesiones: si no, el access token vigente (hasta 15 min) y el
  // refresh token (hasta 7 días) seguirían funcionando tras la baja.
  await revokeAllUserRefreshTokens(req.params.id);
  res.json({ ok: true });
});

export default router;
