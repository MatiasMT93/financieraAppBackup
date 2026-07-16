import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

/** Throw this from any service to return a specific HTTP status to the client. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ ok: false, error: 'Datos inválidos', details: err.flatten() });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ ok: false, error: err.message });
    return;
  }

  // Known business rule errors (plain Error with descriptive messages from services)
  const BUSINESS_ERROR_PREFIXES = [
    'Operación no encontrada',
    'Credenciales inválidas',
    'Refresh token',
    'Solo podés',
    'Transición inválida',
    'La operación no puede',
    'Solo se puede',
    'No se puede modificar',
    'Incidencia',
    'Usuario no encontrado',
  ];
  const isBusinessError = BUSINESS_ERROR_PREFIXES.some((p) => err.message.startsWith(p));
  if (isBusinessError) {
    res.status(400).json({ ok: false, error: err.message });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({ ok: false, error: 'Error interno del servidor' });
}
