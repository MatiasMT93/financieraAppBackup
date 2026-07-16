import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { createIncidentSchema, resolveIncidentSchema } from './schemas.js';
import * as service from './service.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRoles('coordinador', 'administrativo', 'dueno'), async (req, res) => {
  const data = await service.listIncidents();
  res.json({ ok: true, data });
});

router.post('/', requireRoles('cadete'), async (req, res) => {
  const body = createIncidentSchema.parse(req.body);
  const data = await service.createIncident(body, req.user!);
  res.status(201).json({ ok: true, data });
});

router.post('/:id/resolve', requireRoles('coordinador'), async (req, res) => {
  const { action } = resolveIncidentSchema.parse(req.body ?? {});
  const data = await service.resolveIncident(req.params.id, req.user!, action);
  res.json({ ok: true, data });
});

export default router;
