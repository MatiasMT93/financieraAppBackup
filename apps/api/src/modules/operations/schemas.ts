import { z } from 'zod';

// `monto`/`moneda` representan el monto a entregar cuando tipo es
// 'entrega_retiro'; `monto2`/`moneda2` representan el monto a retirar y solo
// se usan en ese caso.
// `direccion` es obligatoria salvo en modalidad 'ventanilla' (el cliente
// viene a la oficina, no hay que despachar un cadete a ningún lado): tanto
// 'domicilio' (calle) como 'deposito' llevan un cadete físicamente a algún
// lado, así que necesitan una dirección real para que pueda navegar.
// `banco` solo aplica (y es obligatorio) en modalidad 'deposito'.
const operationFields = z.object({
  tipo: z.enum(['entrega', 'retiro', 'entrega_retiro']),
  moneda: z.enum(['ARS', 'USD', 'EUR', 'BRL', 'USDT']),
  monto: z.number().positive(),
  moneda2: z.enum(['ARS', 'USD', 'EUR', 'BRL', 'USDT']).optional(),
  monto2: z.number().positive().optional(),
  modalidad: z.enum(['domicilio', 'ventanilla', 'deposito']).default('domicilio'),
  direccion: z.string().optional(),
  banco: z.string().optional(),
  contacto: z.string().min(2),
  telefono: z.string().optional(),
  notas: z.string().optional(),
  clientId: z.string().uuid().optional(),
});

function requiresSecondAmount(data: { tipo?: string; monto2?: number; moneda2?: string }) {
  return data.tipo !== 'entrega_retiro' || (data.monto2 !== undefined && data.moneda2 !== undefined);
}

function requiresDireccionForDomicilio(data: { modalidad?: string; direccion?: string }) {
  return data.modalidad === 'ventanilla' || (!!data.direccion && data.direccion.length >= 5);
}

function requiresBancoForDeposito(data: { modalidad?: string; banco?: string }) {
  return data.modalidad !== 'deposito' || (!!data.banco && data.banco.trim().length >= 2);
}

export const createOperationSchema = operationFields
  .refine(requiresSecondAmount, {
    message: 'monto2 y moneda2 son obligatorios cuando tipo es entrega_retiro',
    path: ['monto2'],
  })
  .refine(requiresDireccionForDomicilio, {
    message: 'La dirección es obligatoria para entregas a domicilio o depósito',
    path: ['direccion'],
  })
  .refine(requiresBancoForDeposito, {
    message: 'El banco es obligatorio para la modalidad depósito',
    path: ['banco'],
  });

// La modalidad no se puede editar después de creada: cambia el circuito
// entero (si lleva cadete o no), y de hecho una operación 'ventanilla'
// nunca es editable porque nace directamente 'cerrada'.
export const updateOperationSchema = operationFields
  .omit({ modalidad: true })
  .partial()
  .refine(requiresSecondAmount, {
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
