import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { z } from 'zod';
import * as repo from './repository.js';

const router = Router();
router.use(authenticate);

router.get('/suggest', requireRoles('administrativo', 'dueno'), async (req, res) => {
  const { query } = z.object({ query: z.string().min(2) }).parse(req.query);
  const data = await repo.suggestContactsByQuery(query);
  res.json({ ok: true, data });
});

export default router;
