import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema, refreshSchema, registerSchema } from './schemas.js';
import * as service from './service.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Protección anti fuerza bruta del login. 20 intentos por IP cada 15 min:
// suficiente para reintentos legítimos (tipeo, varios usuarios en una oficina
// con la misma IP) sin abrir la puerta a un ataque.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos. Esperá 15 minutos.' },
});

// El refresh se dispara solo (al expirar el access token, varias queries en
// paralelo, etc.), así que NO puede compartir el cupo del login o lockearía a
// usuarios legítimos. Los refresh tokens son aleatorios de 512 bits: imposibles
// de adivinar por fuerza bruta, por eso el límite es holgado (sólo anti abuso).
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiadas solicitudes. Esperá unos minutos.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Límite de registros alcanzado. Intentá en una hora.' },
});

/** POST /api/auth/register — público, cadete se auto-registra */
router.post('/register', registerLimiter, async (req, res) => {
  const body = registerSchema.parse(req.body);
  const result = await service.register(body);
  res.status(201).json({ ok: true, data: result });
});

/** POST /api/auth/login */
router.post('/login', loginLimiter, async (req, res) => {
  const { usuario, password } = loginSchema.parse(req.body);
  const result = await service.login(usuario, password);
  res.json({ ok: true, data: result });
});

/** POST /api/auth/refresh */
router.post('/refresh', refreshLimiter, async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await service.refresh(refreshToken);
  res.json({ ok: true, data: result });
});

/** POST /api/auth/logout */
router.post('/logout', async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  await service.logout(refreshToken);
  res.json({ ok: true, data: null });
});

/** GET /api/auth/me */
router.get('/me', authenticate, async (req, res) => {
  const user = await service.getMe(req.user!.id);
  res.json({ ok: true, data: user });
});

export default router;
