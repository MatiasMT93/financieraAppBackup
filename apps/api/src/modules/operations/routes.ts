import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import {
  createOperationSchema,
  updateOperationSchema,
  transitionSchema,
  assignSchema,
  modifyAmountSchema,
  listOperationsSchema,
} from './schemas.js';
import * as service from './service.js';
import type { OperationStatus } from '@cambioapp/shared-types';

const router = Router();

router.use(authenticate);

// 1. LISTAR operaciones
router.get('/', async (req, res) => {
  const filters = listOperationsSchema.parse(req.query);
  if (req.user!.role === 'cadete') {
    filters.cadeteId = req.user!.id;
  }
  const data = await service.listOperations(filters);
  res.json({ ok: true, data });
});

// 2. OBTENER UNA operación por ID (usando getOperation)
router.get('/:id', async (req, res, next) => {
  console.log('🔍 GET /owner/operations/:id', req.params.id);
  try {
    const data = await service.getOperation(req.params.id);
    console.log('✅ Operación encontrada:', data.id);
    res.json({ ok: true, data });
  } catch (error: any) {
    console.error('❌ Error en GET /:id', error.message);
    if (error.message === 'Operación no encontrada') {
      return res.status(404).json({ ok: false, error: error.message });
    }
    next(error);
  }
});

// 3. CREAR operación
router.post('/', requireRoles('administrativo', 'dueno'), async (req, res) => {
  const body = createOperationSchema.parse(req.body);
  const data = await service.createOperation(body, req.user!);
  res.status(201).json({ ok: true, data });
});

// 4. ACTUALIZAR operación
router.patch('/:id', requireRoles('administrativo', 'dueno'), async (req, res) => {
  const body = updateOperationSchema.parse(req.body);
  const data = await service.updateOperation(req.params.id, body, req.user!);
  res.json({ ok: true, data });
});

// 5. CANCELAR operación
router.post('/:id/cancel', requireRoles('administrativo', 'dueno'), async (req, res) => {
  const data = await service.cancelOperation(req.params.id, req.user!);
  res.json({ ok: true, data });
});

// 6. DESASIGNAR cadete
router.post('/:id/unassign', requireRoles('coordinador', 'dueno'), async (req, res) => {
  const data = await service.unassignCadete(req.params.id, req.user!);
  res.json({ ok: true, data });
});

// 7. ASIGNAR cadete
router.post('/:id/assign', requireRoles('coordinador', 'dueno'), async (req, res) => {
  const { cadeteId } = assignSchema.parse(req.body);
  const data = await service.assignCadete(req.params.id, cadeteId, req.user!);
  res.json({ ok: true, data });
});

// 8. TRANSICIÓN de estado
router.post('/:id/transition', requireRoles('cadete', 'coordinador', 'dueno'), async (req, res) => {
  const { newStatus } = transitionSchema.parse(req.body);
  const data = await service.transitionStatus(req.params.id, newStatus as OperationStatus, req.user!);
  res.json({ ok: true, data });
});

// 9. MODIFICAR monto
router.post('/:id/modify-amount', requireRoles('cadete'), async (req, res) => {
  const { monto } = modifyAmountSchema.parse(req.body);
  const data = await service.modifyAmount(req.params.id, monto, req.user!);
  res.json({ ok: true, data });
});

export default router;