import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { z } from 'zod';
import { getActiveOperationsForOwner, getCashInStreet, getDailyAccountingLedger } from '../operations/repository.js';
import type { Currency, OperationType } from '@cambioapp/shared-types';

const periodSchema = z.object({
  period: z.enum(['today', 'week', 'month']).default('today'),
});

const accountingSchema = z.object({
  date: z.string().optional(),
});

const router = Router();
router.use(authenticate);

router.get('/summary', requireRoles('dueno', 'coordinador'), async (req, res) => {
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
    USDT: { totalMoved: 0, comprado: 0, vendido: 0, opComprado: 0, opVendido: 0 },
  };

  for (const op of ops) {
    const currency = op.moneda as Currency;
    const monto = parseFloat(String(op.monto));
    const tipo = op.tipo as OperationType;

    // En 'entrega_retiro', `monto`/`moneda` son el monto a entregar (vendido)
    // y `monto2`/`moneda2` el monto a retirar (comprado); pueden estar en
    // monedas distintas, así que se suman por separado a cada bucket.
    if (tipo === 'retiro') {
      byCurrency[currency].comprado += monto;
      byCurrency[currency].opComprado++;
      byCurrency[currency].totalMoved += monto;
    } else {
      byCurrency[currency].vendido += monto;
      byCurrency[currency].opVendido++;
      byCurrency[currency].totalMoved += monto;

      if (tipo === 'entrega_retiro' && op.monto2 != null && op.moneda2) {
        const currency2 = op.moneda2 as Currency;
        const monto2 = parseFloat(String(op.monto2));
        byCurrency[currency2].comprado += monto2;
        byCurrency[currency2].opComprado++;
        byCurrency[currency2].totalMoved += monto2;
      }
    }
  }

  // Obtener datos de contabilidad
  const accounting: Record<string, any> = {};
  const now = new Date();
  const startDate = new Date();
  
  if (period === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    startDate.setDate(now.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
  }

  // Obtener ledgers para cada día en el rango
  const dates: string[] = [];
  const current = new Date(startDate);
  while (current <= now) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  for (const date of dates) {
    try {
      const ledger = await getDailyAccountingLedger(date);
      if (ledger && ledger.byCurrency) {
        for (const group of ledger.byCurrency) {
          if (!accounting[group.currency as string]) {
            accounting[group.currency as string] = {
              balance: 0,
              entradas: 0,
              salidas: 0,
              dias: 0,
            };
          }
          accounting[group.currency as string].balance += Number(group.saldoFinal);
          accounting[group.currency as string].dias++;

          // Calcular entradas y salidas
          if (group.lines && Array.isArray(group.lines)) {
            for (const line of group.lines) {
              const valor = Number(line.valorFinal);
              // Retiro = entra dinero a la caja. Entrega = sale dinero de la caja.
              if (line.concepto === 'Retiro' || line.concepto.toLowerCase().includes('retiro')) {
                accounting[group.currency as string].entradas += valor;
              } else {
                accounting[group.currency as string].salidas += valor;
              }
            }
          }
        }
      }
    } catch (_err) {
      // Si falla un día, continuar
    }
  }

  // Calcular promedio y ratio
  for (const currency in accounting) {
    const acc = accounting[currency];
    if (acc.dias > 0) {
      acc.promedioDiario = Math.round(acc.balance / acc.dias);
      acc.ratioEntradaSalida = acc.salidas > 0 ? acc.entradas / acc.salidas : 0;
    }
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
      accounting: Object.keys(accounting).length > 0 ? accounting : undefined,
    },
  });
});

router.get('/cash-in-street', requireRoles('dueno', 'coordinador'), async (_req, res) => {
  const ops = await getCashInStreet();
  const byCurrency: Record<Currency, { total: number; operationCount: number }> = {
    ARS: { total: 0, operationCount: 0 },
    USD: { total: 0, operationCount: 0 },
    EUR: { total: 0, operationCount: 0 },
    BRL: { total: 0, operationCount: 0 },
    USDT: { total: 0, operationCount: 0 },
  };

  for (const op of ops) {
    const currency = op.moneda as Currency;
    byCurrency[currency].total += parseFloat(String(op.monto));
    byCurrency[currency].operationCount++;

    if (op.tipo === 'entrega_retiro' && op.monto2 != null && op.moneda2) {
      const currency2 = op.moneda2 as Currency;
      byCurrency[currency2].total += parseFloat(String(op.monto2));
      byCurrency[currency2].operationCount++;
    }
  }

  res.json({
    ok: true,
    data: Object.entries(byCurrency).map(([currency, stats]) => ({ currency, ...stats })),
  });
});

router.get('/cajas', requireRoles('dueno', 'coordinador', 'administrativo'), async (req, res) => {
  const { date } = accountingSchema.parse(req.query);
  const ledger = await getDailyAccountingLedger(date ?? new Date().toISOString().slice(0, 10));
  res.json({ ok: true, data: ledger });
});

export default router;
