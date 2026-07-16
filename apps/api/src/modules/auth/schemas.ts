import { z } from 'zod';

export const loginSchema = z.object({
  usuario: z.string().min(1),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const registerSchema = z.object({
  usuario: z.string().min(2).max(100),
  nombre: z.string().min(2).max(100),
  apellido: z.string().min(2).max(100),
  celular: z.string().min(6).max(50),
  password: z.string().min(6),
});
