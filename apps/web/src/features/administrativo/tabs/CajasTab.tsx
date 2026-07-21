import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/api/client.ts';
import { Download } from 'lucide-react';
import type { AccountingLedger } from '@cambioapp/shared-types';
import * as XLSX from 'xlsx';

const CURRENCY_SYMBOLS: Record<string, string> = {
  ARS: '$', USD: 'U$', EUR: '€', BRL: 'R$', USDT: '₮',
};

const CURRENCY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  ARS: { bg: '#FEF3C7', border: '#F59E0B', text: '#B45309' },
  USD: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
  EUR: { bg: '#DCFCE7', border: '#10B981', text: '#065F46' },
  BRL: { bg: '#FCE7F3', border: '#EC4899', text: '#831843' },
  USDT: { bg: '#F3E8FF', border: '#A855F7', text: '#6B21A8' },
};

export default function CajasTab() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ARS');

  // Fetch ledgers for all dates in range
  const dateRange = useMemo(() => {
    const dates = [];
    const current = new Date(dateFrom);
    const end = new Date(dateTo);
    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [dateFrom, dateTo]);

  const { data: ledgers, isLoading } = useQuery({
    queryKey: ['owner-cajas-range', dateFrom, dateTo],
    queryFn: async () => {
      const results = await Promise.all(
        dateRange.map(date =>
          apiGet<AccountingLedger>(`/owner/cajas?date=${date}`).catch(() => null)
        )
      );
      return results.filter((r): r is AccountingLedger => r !== null);
    },
  });

  // Aggregate data
  const aggregated = useMemo(() => {
    if (!ledgers || ledgers.length === 0)
      return { byCurrency: {} as Record<string, { entries: number; entradas: number; salidas: number; saldo: number; dateCount: number }>, dateCount: 0 };

    const byCurrency: Record<
      string,
      {
        entries: number;
        entradas: number;
        salidas: number;
        saldo: number;
        dateCount: number;
      }
    > = {};

    ledgers.forEach(ledger => {
      ledger.byCurrency.forEach(group => {
        if (!byCurrency[group.currency]) {
          byCurrency[group.currency] = {
            entries: 0,
            entradas: 0,
            salidas: 0,
            saldo: 0,
            dateCount: 0,
          };
        }

        byCurrency[group.currency].entries += group.entries;
        byCurrency[group.currency].saldo += Number(group.saldoFinal);
        byCurrency[group.currency].dateCount++;

        // Calcular entradas vs salidas basado en los tipos
        group.lines.forEach(line => {
          const valor = Number(line.valorFinal);
          // Retiro = entra dinero a la caja. Entrega = sale dinero de la caja.
          if (line.concepto === 'Retiro' || line.concepto.toLowerCase().includes('retiro')) {
            byCurrency[group.currency].entradas += valor;
          } else {
            byCurrency[group.currency].salidas += valor;
          }
        });
      });
    });

    return {
      byCurrency,
      dateCount: new Set(ledgers.map(l => l.date)).size,
    };
  }, [ledgers]);

  const formattedDateFrom = useMemo(() => {
    const [y, m, d] = dateFrom.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  }, [dateFrom]);

  const formattedDateTo = useMemo(() => {
    const [y, m, d] = dateTo.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  }, [dateTo]);

  const currencies = Object.keys(aggregated.byCurrency).sort();
  const filteredCurrencies = selectedCurrency ? [selectedCurrency] : currencies;

  const maxValue = Math.max(
    ...filteredCurrencies.map(c => Math.abs((aggregated.byCurrency[c]?.saldo as number) || 0))
  );

  // Función para generar y descargar CSV
  const handleExportCSV = () => {
    if (!ledgers || ledgers.length === 0) return;

    const symbol = CURRENCY_SYMBOLS[selectedCurrency];
    const data = (aggregated.byCurrency[selectedCurrency] as any);

    // Datos de asientos
    const detallRows: (string | number)[][] = [];
    let totalEntradas = 0;
    let totalSalidas = 0;

    detallRows.push(['Fecha', 'ID Operación', 'Concepto', 'Tipo', 'Valor Final']);

    ledgers.forEach(ledger => {
      const ledgerData = ledger as any;
      if (ledgerData.byCurrency && ledgerData.byCurrency[selectedCurrency]) {
        const currencyData = ledgerData.byCurrency[selectedCurrency];
        if (currencyData.lines && Array.isArray(currencyData.lines)) {
          currencyData.lines.forEach((line: any) => {
            const valorFinal = Number(line.valorFinal);
            const isEntrada = line.concepto === 'Entrega' || line.concepto.toLowerCase().includes('entrega');

            if (isEntrada) {
              totalEntradas += valorFinal;
            } else {
              totalSalidas += valorFinal;
            }

            detallRows.push([
              ledgerData.date,
              line.operationId,
              line.concepto,
              line.concepto,
              valorFinal,
            ]);
          });
        }
      }
    });

    // Hoja 1: Resumen
    const resumenData = [
      ['REPORTE DE CAJAS - ' + selectedCurrency],
      ['Período: ' + dateFrom + ' al ' + dateTo],
      [],
      ['MÉTRICA', 'VALOR'],
      ['Total Entradas', totalEntradas],
      ['Total Salidas', totalSalidas],
      ['Balance Neto', totalEntradas - totalSalidas],
      ['Promedio Diario', Math.round(data.saldo / aggregated.dateCount)],
      ['Ratio Entrada/Salida', (totalEntradas / Math.max(totalSalidas, 1)).toFixed(2)],
      ['Días analizados', aggregated.dateCount],
    ];

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(resumenData);
    const ws2 = XLSX.utils.aoa_to_sheet(detallRows);

    // Establecer ancho de columnas
    ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];
    ws2['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle');

    // Escribir archivo
    XLSX.writeFile(wb, `Cajas_${selectedCurrency}_${dateFrom}_${dateTo}.xlsx`);
  };

  // Recolectar datos por fecha para gráfico
  const dataByDate = useMemo(() => {
    if (!ledgers) return [];
    const byDateMap = new Map<string, { entradas: number; salidas: number }>();
    
    ledgers.forEach(ledger => {
      const ledgerData = ledger as any;
      if (ledgerData.byCurrency && ledgerData.byCurrency[selectedCurrency]) {
        const currencyData = ledgerData.byCurrency[selectedCurrency];
        if (currencyData.lines && Array.isArray(currencyData.lines)) {
          let entradas = 0, salidas = 0;
          currencyData.lines.forEach((line: any) => {
            const valor = Number(line.valorFinal);
            if (line.concepto === 'Entrega' || line.concepto.toLowerCase().includes('entrega')) {
              entradas += valor;
            } else {
              salidas += valor;
            }
          });
          byDateMap.set(ledgerData.date, { entradas, salidas });
        }
      }
    });
    
    return Array.from(byDateMap.entries())
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [ledgers, selectedCurrency]);

  const maxDailyValue = Math.max(
    ...dataByDate.map(d => Math.max(d.entradas, d.salidas))
  ) || 1;

  if (isLoading) {
    return (
      <section className="p-4 space-y-4">
        <p className="text-sm text-gray-500">Cargando datos...</p>
      </section>
    );
  }

  return (
    <section className="p-6 space-y-6 text-gray-200" style={{ color: '#111827' }}>
      {/* Encabezado con controles */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-200">Cajas</h1>
          <p className="text-sm text-gray-400 mt-1">Panel de análisis de flujo de efectivo</p>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-200 uppercase">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-200 uppercase">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium"
            />
          </div>
        </div>
      </div>

      {/* Encabezado de período */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 font-semibold uppercase">Período: {formattedDateFrom} — {formattedDateTo}</p>
          <p className="text-xs text-gray-500 mt-1">{aggregated.dateCount} {aggregated.dateCount === 1 ? 'día' : 'días'}</p>
        </div>
        {ledgers && ledgers.length > 0 && selectedCurrency && (aggregated.byCurrency[selectedCurrency] as any)?.entries > 0 && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 transition-colors font-semibold text-sm"
          >
            <Download size={18} />
            Exportar a Sheets
          </button>
        )}
      </div>

      {/* Selector de monedas */}
      {currencies.length > 0 && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {currencies.map(curr => {
              const data = (aggregated.byCurrency[curr] as any);
              const symbol = CURRENCY_SYMBOLS[curr];
              const isSelected = selectedCurrency === curr;
              const borderColor = CURRENCY_COLORS[curr].border;

              return (
                <button
                  key={curr}
                  onClick={() => setSelectedCurrency(curr)}
                  className={`flex-shrink-0 rounded-lg px-4 py-3 transition-all font-medium text-sm ${
                    isSelected
                      ? 'bg-white border-2 shadow-lg'
                      : 'bg-white border border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    borderColor: isSelected ? borderColor : undefined,
                  }}
                >
                  <div className="font-bold text-base">{symbol} {data.saldo.toLocaleString('es-AR')}</div>
                  <div className="text-xs text-gray-500">{curr} • {data.entries} asientos</div>
                </button>
              );
            })}
          </div>

          {/* HERO SECTION - Balance grande estilo Binance */}
          {selectedCurrency && (
            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
              <div className="grid grid-cols-3 gap-8">
                {/* Columna 1: Balance */}
                <div>
                  <p className="text-sm text-gray-600 font-medium uppercase tracking-wide mb-2">Balance Total</p>
                  <p className="text-4xl font-bold" style={{ color: CURRENCY_COLORS[selectedCurrency].text }}>
                    {CURRENCY_SYMBOLS[selectedCurrency]}{' '}
                    {((aggregated.byCurrency[selectedCurrency] as any)?.saldo || 0).toLocaleString('es-AR')}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Período: {aggregated.dateCount} días</p>
                </div>

                {/* Columna 2: Promedio y Ratio */}
                <div className="flex flex-col justify-center">
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 font-medium uppercase tracking-wide mb-1">Promedio Diario</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {CURRENCY_SYMBOLS[selectedCurrency]}{' '}
                      {Math.round(((aggregated.byCurrency[selectedCurrency] as any)?.saldo || 0) / aggregated.dateCount).toLocaleString('es-AR')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Tu saldo promedio cada día</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium uppercase tracking-wide mb-1">Ratio E/S</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {((aggregated.byCurrency[selectedCurrency] as any)?.entradas || 0 > 0
                        ? (((aggregated.byCurrency[selectedCurrency] as any)?.entradas || 0) / (Math.max((aggregated.byCurrency[selectedCurrency] as any)?.salidas || 1, 1))).toFixed(2)
                        : '0')}
                      x
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Por cada peso que sale, entra...</p>
                  </div>
                </div>

                {/* Columna 3: Entradas y Salidas */}
                <div className="space-y-4">
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                    <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-1">ENTRADAS</p>
                    <p className="text-2xl font-bold text-green-700">
                      +{CURRENCY_SYMBOLS[selectedCurrency]}{' '}
                      {((aggregated.byCurrency[selectedCurrency] as any)?.entradas || 0).toLocaleString('es-AR')}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Dinero recibido</p>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                    <p className="text-xs text-red-700 font-semibold uppercase tracking-wide mb-1">SALIDAS</p>
                    <p className="text-2xl font-bold text-red-700">
                      -{CURRENCY_SYMBOLS[selectedCurrency]}{' '}
                      {((aggregated.byCurrency[selectedCurrency] as any)?.salidas || 0).toLocaleString('es-AR')}
                    </p>
                    <p className="text-xs text-red-600 mt-1">Dinero entregado</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GRÁFICO: Entradas vs Salidas por día */}
          {selectedCurrency && dataByDate.length > 0 && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-6">Flujo de Efectivo Diario</h3>
              <div className="space-y-4">
                {dataByDate.map((day, idx) => (
                  <div key={idx} className="flex items-end gap-4">
                    <div className="w-16 text-right">
                      <p className="text-xs font-semibold text-gray-300">{day.date}</p>
                    </div>
                    <div className="flex-1 flex items-end gap-2 h-16">
                      {/* Barra Entradas (Verde) */}
                      <div className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg transition-all hover:shadow-lg"
                          style={{
                            height: `${(day.entradas / maxDailyValue) * 100}%`,
                            minHeight: day.entradas > 0 ? '4px' : '0px',
                          }}
                          title={`Entradas: ${CURRENCY_SYMBOLS[selectedCurrency]}${day.entradas.toLocaleString('es-AR')}`}
                        />
                        <p className="text-xs text-green-300 font-semibold mt-2">
                          +{day.entradas > 0 ? CURRENCY_SYMBOLS[selectedCurrency] + (day.entradas / 1000).toFixed(1) + 'k' : '0'}
                        </p>
                      </div>
                      {/* Barra Salidas (Rojo) */}
                      <div className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t-lg transition-all hover:shadow-lg"
                          style={{
                            height: `${(day.salidas / maxDailyValue) * 100}%`,
                            minHeight: day.salidas > 0 ? '4px' : '0px',
                          }}
                          title={`Salidas: ${CURRENCY_SYMBOLS[selectedCurrency]}${day.salidas.toLocaleString('es-AR')}`}
                        />
                        <p className="text-xs text-red-300 font-semibold mt-2">
                          -{day.salidas > 0 ? CURRENCY_SYMBOLS[selectedCurrency] + (day.salidas / 1000).toFixed(1) + 'k' : '0'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-500 flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-300">Entradas (Entregas)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-sm text-gray-300">Salidas (Retiros)</span>
                </div>
              </div>
            </div>
          )}

          {/* Detalle de asientos */}
          {ledgers && ledgers.length > 0 && selectedCurrency && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Detalle de Asientos</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {ledgers.map(ledger => {
                  const currencyGroup = ledger.byCurrency.find(g => g.currency === selectedCurrency);
                  if (!currencyGroup || currencyGroup.lines.length === 0) return null;

                  const [y, m, d] = ledger.date.split('-').map(Number);
                  const dateObj = new Date(y, m - 1, d);
                  const dateStr = dateObj.toLocaleDateString('es-AR', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div key={ledger.date} className="rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                      <p className="text-sm font-bold text-gray-900 mb-3">{dateStr}</p>
                      <div className="space-y-2">
                        {currencyGroup.lines.map((line, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm py-2 px-2 hover:bg-gray-50 rounded transition-colors">
                            <div className="flex items-center gap-2 flex-1">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: line.concepto === 'Entrega' ? '#10B981' : '#EF4444' }}
                              />
                              <div>
                                <p className="font-medium text-gray-800">#{line.operationId.slice(-4).toUpperCase()}</p>
                                <p className="text-xs text-gray-500">{line.concepto}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-mono font-semibold text-gray-900">
                                {CURRENCY_SYMBOLS[selectedCurrency]} {Number(line.valorFinal).toLocaleString('es-AR')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {ledgers && ledgers.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-lg text-gray-600 font-medium">No hay datos para el período seleccionado</p>
          <p className="text-sm text-gray-500 mt-2">Intenta con otro período o crea nuevas operaciones</p>
        </div>
      )}
    </section>
  );
}
