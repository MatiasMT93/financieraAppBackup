import type { Currency, OperationType } from '@cambioapp/shared-types';

export interface AccountingEntry {
  operationId: string;
  operationType: OperationType;
  date: string;
  kind: 'entrega' | 'retiro';
  currency: Currency;
  concepto: string;
  valorInicial: number;
  valorFinal: number;
}

export interface AccountingLedger {
  date: string;
  totalEntries: number;
  byCurrency: Array<{
    currency: Currency;
    saldoFinal: number;
    entries: number;
    lines: AccountingEntry[];
  }>;
}

interface OperationLike {
  id: string;
  tipo: OperationType;
  moneda: Currency;
  monto: number | string;
  moneda2?: Currency | null;
  monto2?: number | string | null;
  createdAt: string;
}

interface CorrectionLike {
  montoNuevo?: number | string | null;
}

export function buildAccountingLedger(
  operations: OperationLike[],
  correctionsByOperationId: Record<string, CorrectionLike[]> = {},
  date: string,
): AccountingLedger {
  const lines: AccountingEntry[] = [];

  for (const op of operations) {
    const initialMain = Number(op.monto);
    const finalMain = getFinalAmount(op.id, initialMain, correctionsByOperationId[op.id]);

    if (op.tipo === 'entrega_retiro') {
      lines.push({
        operationId: op.id,
        operationType: op.tipo,
        date,
        kind: 'entrega',
        currency: op.moneda,
        concepto: 'Entrega',
        valorInicial: initialMain,
        valorFinal: finalMain,
      });

      const secondaryAmount = op.monto2 == null ? null : Number(op.monto2);
      if (secondaryAmount != null) {
        lines.push({
          operationId: op.id,
          operationType: op.tipo,
          date,
          kind: 'retiro',
          currency: op.moneda2 ?? op.moneda,
          concepto: 'Retiro',
          valorInicial: secondaryAmount,
          valorFinal: secondaryAmount,
        });
      }
      continue;
    }

    lines.push({
      operationId: op.id,
      operationType: op.tipo,
      date,
      kind: op.tipo === 'retiro' ? 'retiro' : 'entrega',
      currency: op.moneda,
      concepto: op.tipo === 'retiro' ? 'Retiro' : 'Entrega',
      valorInicial: initialMain,
      valorFinal: finalMain,
    });
  }

  const byCurrency = Object.entries(groupLinesByCurrency(lines)).map(([currency, entries]) => ({
    currency: currency as Currency,
    saldoFinal: entries.reduce((sum, line) => sum + line.valorFinal, 0),
    entries: entries.length,
    lines: entries,
  }));

  return {
    date,
    totalEntries: lines.length,
    byCurrency,
  };
}

function groupLinesByCurrency(lines: AccountingEntry[]) {
  return lines.reduce<Record<Currency, AccountingEntry[]>>((acc, line) => {
    acc[line.currency] = acc[line.currency] ?? [];
    acc[line.currency].push(line);
    return acc;
  }, {
    ARS: [],
    USD: [],
    EUR: [],
    BRL: [],
    USDT: [],
  });
}

function getFinalAmount(operationId: string, initial: number, corrections?: CorrectionLike[]) {
  const latestCorrection = corrections?.[corrections.length - 1];
  if (latestCorrection?.montoNuevo != null) {
    return Number(latestCorrection.montoNuevo);
  }

  return initial;
}
