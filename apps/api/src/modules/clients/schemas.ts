import { z } from 'zod';

export const createClientSchema = z.object({
  nombre: z.string().min(2).max(200),
  telefono: z.string().max(50).optional(),
  direccion: z.string().optional(),
  notas: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const listClientsSchema = z.object({
  q: z.string().optional(),
});
