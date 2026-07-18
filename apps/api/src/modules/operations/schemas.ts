import { z } from 'zod';

export const createOperationSchema = z.object({
  tipo: z.enum(['entrega', 'retiro']),
  moneda: z.enum(['ARS', 'USD', 'EUR', 'BRL', 'USDT']),
  monto: z.number().positive(),
  direccion: z.string().min(5),
  contacto: z.string().min(2),
  telefono: z.string().optional(),
  notas: z.string().optional(),
});

export const updateOperationSchema = createOperationSchema.partial();

export const transitionSchema = z.object({
  newStatus: z.enum([
    'pendiente',
    'asignada',
    'en_camino',
    'en_destino',
    'volviendo',
    'cerrada',
    'cancelada',
    'incidencia',
  ]),
});

export const assignSchema = z.object({
  cadeteId: z.string().uuid(),
});

export const modifyAmountSchema = z.object({
  monto: z.number().positive(),
});

const statusEnum = z.enum([
  'pendiente',
  'asignada',
  'en_camino',
  'en_destino',
  'volviendo',
  'cerrada',
  'cancelada',
  'incidencia',
]);

export const listOperationsSchema = z.object({
  // Acepta un único status ("en_camino") o varios separados por coma
  // ("en_camino,en_destino,volviendo"). Esto último lo usa el filtro
  // "En curso" del panel del coordinador, que agrupa varios estados.
  status: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
      return parts.map((p) => statusEnum.parse(p));
    }),
  cadeteId: z.string().uuid().optional(),
  date: z.string().optional(), // ISO date string
});
