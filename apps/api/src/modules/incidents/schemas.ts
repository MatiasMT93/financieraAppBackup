import { z } from 'zod';

export const createIncidentSchema = z.object({
  operationId: z.string().uuid(),
  descripcion: z.string().min(10),
});

// Al resolver la incidencia el coordinador decide qué hacer con la operación:
// "resume" (default) la devuelve al estado en que estaba antes de la incidencia
// para que el cadete pueda terminarla; "cancel" la cancela definitivamente.
export const resolveIncidentSchema = z.object({
  action: z.enum(['resume', 'cancel']).optional().default('resume'),
});
