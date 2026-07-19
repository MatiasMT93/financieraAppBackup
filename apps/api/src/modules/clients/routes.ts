import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { createClientSchema, updateClientSchema, listClientsSchema } from './schemas.js';
import * as repo from './repository.js';

const router = Router();

router.use(authenticate, requireRoles('administrativo', 'dueno'));

router.get('/', async (req, res) => {
  const { q } = listClientsSchema.parse(req.query);
  const [list, stats] = await Promise.all([repo.listClients(q), repo.getClientsStats()]);
  res.json({ ok: true, data: { clients: list, stats } });
});

router.post('/', async (req, res) => {
  const body = createClientSchema.parse(req.body);
  const client = await repo.createClient(body, req.user!.id);
  res.status(201).json({ ok: true, data: client });
});

router.patch('/:id', async (req, res) => {
  const existing = await repo.findClientById(req.params.id);
  if (!existing) {
    res.status(404).json({ ok: false, error: 'Cliente no encontrado' });
    return;
  }
  const body = updateClientSchema.parse(req.body);
  const client = await repo.updateClient(req.params.id, body);
  res.json({ ok: true, data: client });
});

router.delete('/:id', async (req, res) => {
  const existing = await repo.findClientById(req.params.id);
  if (!existing) {
    res.status(404).json({ ok: false, error: 'Cliente no encontrado' });
    return;
  }
  const operationsCount = await repo.countClientOperations(req.params.id);
  if (operationsCount > 0) {
    res.status(409).json({
      ok: false,
      error: `No se puede eliminar: tiene ${operationsCount} operación${operationsCount === 1 ? '' : 'es'} asociada${operationsCount === 1 ? '' : 's'}.`,
    });
    return;
  }
  await repo.deleteClient(req.params.id);
  res.json({ ok: true });
});

export default router;
