import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { z } from 'zod';
import { getActiveOperationsForOwner, getCashInStreet } from '../operations/repository.js';
import type { Currency, OperationType } from '@cambioapp/shared-types';

const periodSchema = z.object({
  period: z.enum(['today', 'week', 'month']).default('today'),
});

const router = Router();
router.use(authenticate, requireRoles('dueno', 'coordinador'));

router.get('/summary', async (req, res) => {
  const { period } = periodSchema.parse(req.query);
  const ops = await getActiveOperationsForOwner(period);

  const byCurrency: Record<
    Currency,
    { totalMoved: number; comprado: number; vendido: number; opComprado: number; opVendido: number }
  > = {
    ARS: { totalMoved: 0, comprado: 0, vendido: 0, opComprado: 0, opVendido: 0 },
    USD: { totalMoved: 0, comprado: 0, vendido: 0, opComprado: 0, opVendido: 0 },
    EUR: { totalMoved: 0, comprado: 0, vendido: 0, opComprado: 0, opVendido: 0 },
    BRL: { totalMoved: 0, comprado: 0, vendido: 0, opComprado: 0, opVendido: 0 },
  };

  for (const op of ops) {
    const currency = op.moneda as Currency;
    const monto = parseFloat(String(op.monto));
    const tipo = op.tipo as OperationType;

    if (tipo === 'retiro') {
      byCurrency[currency].comprado += monto;
      byCurrency[currency].opComprado++;
    } else {
      byCurrency[currency].vendido += monto;
      byCurrency[currency].opVendido++;
    }
    byCurrency[currency].totalMoved += monto;
  }

  res.json({
    ok: true,
    data: {
      period,
      totalOperations: ops.length,
      byCurrency: Object.entries(byCurrency).map(([currency, stats]) => ({
        currency,
        ...stats,
        totalOps: stats.opComprado + stats.opVendido,
      })),
    },
  });
});

router.get('/cash-in-street', async (_req, res) => {
  const ops = await getCashInStreet();
  const byCurrency: Record<Currency, { total: number; operationCount: number }> = {
    ARS: { total: 0, operationCount: 0 },
    USD: { total: 0, operationCount: 0 },
    EUR: { total: 0, operationCount: 0 },
    BRL: { total: 0, operationCount: 0 },
  };

  for (const op of ops) {
    const currency = op.moneda as Currency;
    byCurrency[currency].total += parseFloat(String(op.monto));
    byCurrency[currency].operationCount++;
  }

  res.json({
    ok: true,
    data: Object.entries(byCurrency).map(([currency, stats]) => ({ currency, ...stats })),
  });
});

export default router;
