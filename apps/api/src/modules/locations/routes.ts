import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { postLocationSchema } from './schemas.js';
import * as repo from './repository.js';
import { broadcast } from '../../realtime/socket.js';

const router = Router();

router.use(authenticate);

router.post('/', requireRoles('cadete'), async (req, res) => {
  const body = postLocationSchema.parse(req.body);
  await repo.saveLocation({ ...body, cadeteId: req.user!.id });

  broadcast('location:updated', {
    cadeteId: req.user!.id,
    lat: body.latitude,
    lng: body.longitude,
    accuracy: body.accuracy ?? null,
  });

  res.json({ ok: true, data: null });
});

// El dueño también entra al modo coordinador (/dueno/coord/mapa), así que
// necesita ver las ubicaciones igual que un coordinador o administrativo.
router.get('/current', requireRoles('coordinador', 'administrativo', 'dueno'), async (_req, res) => {
  const data = await repo.getLatestLocations();
  const locations = (data.rows as Record<string, unknown>[]).map((row) => ({
    cadeteId: row.cadeteId,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    updatedAt: row.updatedAt,
    cadeteStatus: row.cadeteStatus,
    cadete: { id: row.cadeteId, nombre: row.nombre },
  }));
  res.json({ ok: true, data: locations });
});

export default router;
