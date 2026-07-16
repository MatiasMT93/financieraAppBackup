import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { JWT_ACCESS_EXPIRY, JWT_REFRESH_EXPIRY, BCRYPT_SALT_ROUNDS } from '@cambioapp/shared-constants';
import * as repo from './repository.js';
import type { AuthUser } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { emitToRole } from '../../realtime/socket.js';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(user: AuthUser): string {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

function capitalize(s: string): string {
  const t = s.trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export async function register(data: {
  usuario: string;
  nombre: string;
  apellido: string;
  celular: string;
  password: string;
}) {
  const usuario = data.usuario.trim().toLowerCase();
  const existing = await repo.findUserByUsuario(usuario);
  if (existing) {
    throw new AppError(409, 'Ya existe un usuario con ese nombre de usuario');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);
  const user = await repo.createPendingUser({
    usuario,
    nombre: capitalize(data.nombre),
    apellido: capitalize(data.apellido),
    celular: data.celular.trim(),
    passwordHash,
  });

  try {
    emitToRole('coordinador', 'cadete:pending_registration', {
      user: {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        celular: user.celular,
        role: user.role,
        isActive: user.isActive,
        pendingApproval: user.pendingApproval,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch {
    // Socket puede no estar inicializado en tests; no bloquear el registro
  }

  return { message: 'Registro enviado. Esperá la aprobación del coordinador.' };
}

export async function login(usuario: string, password: string) {
  const user = await repo.findUserByUsuario(usuario.trim().toLowerCase());
  if (!user || !user.isActive) {
    throw new Error('Credenciales inválidas');
  }

  if (user.pendingApproval) {
    throw new AppError(403, 'Tu cuenta está pendiente de aprobación por el coordinador');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Credenciales inválidas');
  }

  const authUser: AuthUser = { id: user.id, nombre: user.nombre, role: user.role };
  const accessToken = generateAccessToken(authUser);
  const refreshToken = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await repo.saveRefreshToken(user.id, hashToken(refreshToken), expiresAt);

  return { accessToken, refreshToken, user: authUser };
}

export async function refresh(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken);
  const stored = await repo.findValidRefreshToken(tokenHash);
  if (!stored) {
    throw new Error('Refresh token inválido o expirado');
  }

  const user = await repo.findUserById(stored.userId);
  if (!user || !user.isActive) {
    throw new Error('Usuario no encontrado o inactivo');
  }

  await repo.revokeRefreshToken(stored.id);

  const authUser: AuthUser = { id: user.id, nombre: user.nombre, role: user.role };
  const newAccessToken = generateAccessToken(authUser);
  const newRefreshToken = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await repo.saveRefreshToken(user.id, hashToken(newRefreshToken), expiresAt);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  const stored = await repo.findValidRefreshToken(tokenHash);
  if (stored) {
    await repo.revokeRefreshToken(stored.id);
  }
}

export async function getMe(userId: string) {
  const user = await repo.findUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');
  return { id: user.id, nombre: user.nombre, role: user.role };
}
