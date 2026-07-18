import { z } from 'zod';

// `monto`/`moneda` representan el monto a entregar cuando tipo es
// 'entrega_retiro'; `monto2`/`moneda2` representan el monto a retirar y solo
// se usan en ese caso.
const operationFields = z.object({
  tipo: z.enum(['entrega', 'retiro', 'entrega_retiro']),
  moneda: z.enum(['ARS', 'USD', 'EUR', 'BRL', 'USDT']),
  monto: z.number().positive(),
  moneda2: z.enum(['ARS', 'USD', 'EUR', 'BRL', 'USDT']).optional(),
  monto2: z.number().positive().optional(),
  direccion: z.string().min(5),
  contacto: z.string().min(2),
  telefono: z.string().optional(),
  notas: z.string().optional(),
});

function requiresSecondAmount(data: { tipo?: string; monto2?: number; moneda2?: string }) {
  return data.tipo !== 'entrega_retiro' || (data.monto2 !== undefined && data.moneda2 !== undefined);
}

export const createOperationSchema = operationFields.refine(requiresSecondAmount, {
  message: 'monto2 y moneda2 son obligatorios cuando tipo es entrega_retiro',
  path: ['monto2'],
});

export const updateOperationSchema = operationFields.partial().refine(requiresSecondAmount, {
  message: 'monto2 y moneda2 son obligatorios cuando tipo es entrega_retiro',
  path: ['monto2'],
});

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
