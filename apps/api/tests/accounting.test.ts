import { describe, expect, it } from 'vitest';
import { buildAccountingLedger } from '../src/modules/operations/accounting.js';

describe('buildAccountingLedger', () => {
  it('preserva el valor inicial y usa el valor final más reciente', () => {
    const ledger = buildAccountingLedger(
      [
        {
          id: 'op-1',
          tipo: 'entrega',
          moneda: 'ARS',
          monto: 100,
          montoInicial: 100,
          createdAt: '2026-07-20T10:00:00.000Z',
        } as any,
      ],
      {
        'op-1': [{ montoNuevo: 120 }],
      },
      '2026-07-20',
    );

    expect(ledger.totalEntries).toBe(1);
    expect(ledger.byCurrency[0].lines[0]).toMatchObject({
      valorInicial: 100,
      valorFinal: 120,
    });
  });
});
