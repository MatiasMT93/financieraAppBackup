import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/api/client.ts';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import type { AccountingLedger, Operation } from '@cambioapp/shared-types';
import * as XLSX from 'xlsx';

const CURRENCY_SYMBOLS: Record<string, string> = {
  ARS: '$', USD: 'U$', EUR: '€', BRL: 'R$', USDT: '₮',
};

const CURRENCY_COLORS: Record<string, { border: string; text: string }> = {
  ARS: { border: '#F59E0B', text: '#F5B942' },
  USD: { border: '#3B82F6', text: '#6FA8FF' },
  EUR: { border: '#10B981', text: '#4ADE80' },
  BRL: { border: '#EC4899', text: '#F472B6' },
  USDT: { border: '#A855F7', text: '#C084FC' },
};

type Line = {
  valorFinal: string | number;
  concepto: string;
  operationId: string;
};

type CurrencyGroup = {
  currency: string;
  lines: Line[];
  saldoFinal?: number;
  entries?: number;
};

export default function CajasTab() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ARS');
  const [tooltipOpen, setTooltipOpen] = useState<'promedio' | 'ratio' | null>(null);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [operationDetails, setOperationDetails] = useState<Record<string, Operation>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

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

  // ============================================================
  // AGREGACIÓN
  // ============================================================
  const aggregated = useMemo(() => {
    if (!ledgers || ledgers.length === 0) {
      return {
        byCurrency: {} as Record<
          string,
          {
            entries: number;
            entradas: number;
            salidas: number;
            balanceNeto: number;
            sumaFlujoDiario: number;
            dateCount: number;
          }
        >,
        dateCount: 0,
      };
    }

    const byCurrency: Record<
      string,
      {
        entries: number;
        entradas: number;
        salidas: number;
        balanceNeto: number;
        sumaFlujoDiario: number;
        dateCount: number;
      }
    > = {};

    ledgers.forEach(ledger => {
      const groups = ledger.byCurrency as CurrencyGroup[];
      groups.forEach((group: CurrencyGroup) => {
        const curr = group.currency;
        if (!byCurrency[curr]) {
          byCurrency[curr] = {
            entries: 0,
            entradas: 0,
            salidas: 0,
            balanceNeto: 0,
            sumaFlujoDiario: 0,
            dateCount: 0,
          };
        }

        byCurrency[curr].entries += group.lines.length;
        byCurrency[curr].dateCount++;

        let entradasDiarias = 0;
        let salidasDiarias = 0;
        group.lines.forEach((line: Line) => {
          const valor = Number(line.valorFinal);
          if (line.concepto === 'Entrega' || line.concepto.toLowerCase().includes('entrega')) {
            byCurrency[curr].entradas += valor;
            entradasDiarias += valor;
          } else {
            byCurrency[curr].salidas += valor;
            salidasDiarias += valor;
          }
        });

        byCurrency[curr].sumaFlujoDiario += (entradasDiarias - salidasDiarias);
      });
    });

    Object.keys(byCurrency).forEach(curr => {
      byCurrency[curr].balanceNeto = byCurrency[curr].entradas - byCurrency[curr].salidas;
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

  // ============================================================
  // EXPORTACIÓN
  // ============================================================
  const handleExportCSV = () => {
    if (!ledgers || ledgers.length === 0) return;

    const data = aggregated.byCurrency[selectedCurrency];
    if (!data) return;

    const detallRows: (string | number)[][] = [];
    let totalEntradas = 0;
    let totalSalidas = 0;

    detallRows.push(['Fecha', 'ID Operación', 'Concepto', 'Monto']);

    ledgers.forEach(ledger => {
      const groups = ledger.byCurrency as CurrencyGroup[];
      const currencyData = groups.find((g: CurrencyGroup) => g.currency === selectedCurrency);
      if (currencyData) {
        currencyData.lines.forEach((line: Line) => {
          const valor = Number(line.valorFinal);
          const isEntrada = line.concepto === 'Entrega' || line.concepto.toLowerCase().includes('entrega');
          if (isEntrada) totalEntradas += valor;
          else totalSalidas += valor;

          detallRows.push([
            ledger.date,
            line.operationId,
            line.concepto,
            valor,
          ]);
        });
      }
    });

    const resumenData = [
      ['REPORTE DE CAJAS - ' + selectedCurrency],
      ['Período: ' + dateFrom + ' al ' + dateTo],
      [],
      ['MÉTRICA', 'VALOR'],
      ['Total Entradas', totalEntradas],
      ['Total Salidas', totalSalidas],
      ['Balance Neto', totalEntradas - totalSalidas],
      ['Promedio Diario (flujo neto)', Math.round(data.sumaFlujoDiario / data.dateCount)],
      ['Ratio Entrada/Salida', (totalEntradas / Math.max(totalSalidas, 1)).toFixed(2)],
      ['Días analizados', data.dateCount],
    ];

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(resumenData);
    const ws2 = XLSX.utils.aoa_to_sheet(detallRows);
    ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];
    ws2['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle');
    XLSX.writeFile(wb, `Cajas_${selectedCurrency}_${dateFrom}_${dateTo}.xlsx`);
  };

  // ============================================================
  // DATOS PARA GRÁFICO
  // ============================================================
  const dataByDate = useMemo(() => {
    if (!ledgers) return [];

    const ledgerMap = new Map();
    ledgers.forEach(ledger => {
      ledgerMap.set(ledger.date, ledger);
    });

    return dateRange.map(date => {
      const ledger = ledgerMap.get(date);
      let entradas = 0,
        salidas = 0;
      if (ledger) {
        const groups = ledger.byCurrency as CurrencyGroup[];
        const currencyData = groups.find((g: CurrencyGroup) => g.currency === selectedCurrency);
        if (currencyData) {
          currencyData.lines.forEach((line: Line) => {
            const valor = Number(line.valorFinal);
            if (line.concepto === 'Entrega' || line.concepto.toLowerCase().includes('entrega')) {
              entradas += valor;
            } else {
              salidas += valor;
            }
          });
        }
      }
      const [y, m, d] = date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const displayDate = dateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
      return { date: displayDate, entradas, salidas };
    });
  }, [ledgers, selectedCurrency, dateRange]);

  const maxDailyValue = Math.max(
    ...dataByDate.map(d => Math.max(d.entradas, d.salidas))
  ) || 1;

  // ============================================================
  // HELPERS
  // ============================================================
  const formatCurrency = (value: number) => {
    return `${CURRENCY_SYMBOLS[selectedCurrency]} ${Math.abs(value).toLocaleString('es-AR')}`;
  };

  const formatSignedCurrency = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${formatCurrency(value)}`;
  };

  const getPromedioTooltip = () => {
    const data = aggregated.byCurrency[selectedCurrency];
    if (!data) return '';
    const suma = data.sumaFlujoDiario;
    const dias = data.dateCount;
    const promedio = Math.round(suma / dias);
    return `Se calcula como: Suma del flujo diario (entradas - salidas) (${formatSignedCurrency(suma)}) / Días con movimientos (${dias}) = ${formatSignedCurrency(promedio)}\nNota: Refleja el flujo neto promedio por día.`;
  };

  const getRatioTooltip = () => {
    const data = aggregated.byCurrency[selectedCurrency];
    if (!data) return '';
    const ent = data.entradas;
    const sal = data.salidas;
    const ratio = (ent / Math.max(sal, 1)).toFixed(2);
    return `Se calcula como: Entradas totales (${formatCurrency(ent)}) / Salidas totales (${formatCurrency(sal)}) = ${ratio}x\nIndica cuánto ingresa por cada peso que sale.`;
  };

  // ============================================================
  // FUNCIÓN PARA OBTENER DETALLES DE LA OPERACIÓN
  // ============================================================
  const fetchOperationDetails = async (operationId: string) => {
    if (operationDetails[operationId] || loadingDetails[operationId]) return;

    setLoadingDetails(prev => ({ ...prev, [operationId]: true }));
    try {
      console.log(`🔍 Cargando detalles de operación: ${operationId}`);
      const data = await apiGet<Operation>(`/operations/${operationId}`);
      console.log(`✅ Detalles recibidos:`, data);
      setOperationDetails(prev => ({ ...prev, [operationId]: data }));
    } catch (error) {
      console.error(`❌ Error al cargar detalles de la operación ${operationId}:`, error);
    } finally {
      setLoadingDetails(prev => ({ ...prev, [operationId]: false }));
    }
  };

  // ============================================================
  // TOGGLE EXPAND
  // ============================================================
  const toggleExpand = async (lineId: string, operationId: string) => {
    const isExpanded = expandedLines.has(lineId);

    if (!isExpanded) {
      await fetchOperationDetails(operationId);
    }

    setExpandedLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lineId)) {
        newSet.delete(lineId);
      } else {
        newSet.add(lineId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return <p style={{ color: '#c0c6d0' }}>Cargando…</p>;
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: '0 20px' }}>
      {/* HEADER */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#e6e9ef' }}>Cajas</h1>
          <p style={{ margin: '4px 0 0', color: '#8b93a3', fontSize: 13 }}>Panel de análisis de flujo de efectivo</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#8b93a3', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ padding: '8px 12px', fontSize: 13, fontWeight: 500, background: '#1e2128', border: '1px solid #2c303a', borderRadius: 8, color: '#e6e9ef' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#8b93a3', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ padding: '8px 12px', fontSize: 13, fontWeight: 500, background: '#1e2128', border: '1px solid #2c303a', borderRadius: 8, color: '#e6e9ef' }}
            />
          </div>
        </div>
      </section>

      {/* BARRA DE PERÍODO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e2128', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#c1c7d0', textTransform: 'uppercase' }}>
            Período: {formattedDateFrom} — {formattedDateTo}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8b93a3' }}>
            {aggregated.dateCount} {aggregated.dateCount === 1 ? 'día' : 'días'}
          </p>
        </div>
        {ledgers && ledgers.length > 0 && selectedCurrency && aggregated.byCurrency[selectedCurrency]?.entries > 0 && (
          <button type="button" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0b90b', color: '#1e2128', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>
            <Download size={16} /> Exportar a Sheets
          </button>
        )}
      </div>

      {/* BOTONERA DE MONEDAS */}
      {currencies.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {currencies.map(curr => {
            const data = aggregated.byCurrency[curr];
            const symbol = CURRENCY_SYMBOLS[curr];
            const isSelected = selectedCurrency === curr;
            const colors = CURRENCY_COLORS[curr];
            const balance = data.balanceNeto;
            const sign = balance > 0 ? '+' : '';
            const color = balance > 0 ? colors.text : '#ff8a7a';

            return (
              <button
                key={curr}
                type="button"
                onClick={() => setSelectedCurrency(curr)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  background: isSelected ? '#2c303a' : 'transparent',
                  border: isSelected ? `2px solid ${colors.border}` : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 16, color }}>
                  {sign}{symbol} {Math.abs(balance).toLocaleString('es-AR')}
                </span>
                <span style={{ fontSize: 12, color: '#8b93a3' }}>{curr} • {data.entries} asientos</span>
              </button>
            );
          })}
        </div>
      )}

      {/* RESUMEN PRINCIPAL */}
      {selectedCurrency && aggregated.byCurrency[selectedCurrency] && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, background: '#1e2128', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          {(() => {
            const data = aggregated.byCurrency[selectedCurrency];
            const balance = data.balanceNeto;
            const sign = balance > 0 ? '+' : '';
            const color = balance > 0 ? CURRENCY_COLORS[selectedCurrency].text : '#ff8a7a';
            return (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#8b93a3', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px' }}>
                  Balance Neto
                </p>
                <p style={{ fontSize: 38, fontWeight: 700, margin: 0, color }}>
                  {sign}{CURRENCY_SYMBOLS[selectedCurrency]} {Math.abs(balance).toLocaleString('es-AR')}
                </p>
                <p style={{ fontSize: 12, color: '#8b93a3', margin: '8px 0 0' }}>Flujo neto del período</p>
              </div>
            );
          })()}

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#8b93a3', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
                  Promedio Diario
                </p>
                <button
                  type="button"
                  onClick={() => setTooltipOpen(tooltipOpen === 'promedio' ? null : 'promedio')}
                  style={{ background: 'none', border: 'none', color: '#8b93a3', cursor: 'pointer', fontSize: 14, padding: 0 }}
                >
                  ⓘ
                </button>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#e6e9ef', margin: 0 }}>
                {(() => {
                  const data = aggregated.byCurrency[selectedCurrency];
                  const prom = Math.round(data.sumaFlujoDiario / data.dateCount);
                  const sign = prom > 0 ? '+' : '';
                  return `${sign}${CURRENCY_SYMBOLS[selectedCurrency]} ${Math.abs(prom).toLocaleString('es-AR')}`;
                })()}
              </p>
              {tooltipOpen === 'promedio' && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  background: '#2c303a',
                  border: '1px solid #3a3f4a',
                  borderRadius: 8,
                  padding: '12px 16px',
                  color: '#e6e9ef',
                  fontSize: 13,
                  maxWidth: 320,
                  zIndex: 1000,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  whiteSpace: 'pre-line',
                }}>
                  {getPromedioTooltip().split('\n').map((line, i) => (
                    <p key={i} style={{ margin: i === 0 ? 0 : '8px 0 0', color: i === 0 ? '#e6e9ef' : '#c1c7d0' }}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#8b93a3', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
                  Ratio E/S
                </p>
                <button
                  type="button"
                  onClick={() => setTooltipOpen(tooltipOpen === 'ratio' ? null : 'ratio')}
                  style={{ background: 'none', border: 'none', color: '#8b93a3', cursor: 'pointer', fontSize: 14, padding: 0 }}
                >
                  ⓘ
                </button>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#e6e9ef', margin: 0 }}>
                {(aggregated.byCurrency[selectedCurrency].entradas / Math.max(aggregated.byCurrency[selectedCurrency].salidas, 1)).toFixed(2)}x
              </p>
              {tooltipOpen === 'ratio' && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  background: '#2c303a',
                  border: '1px solid #3a3f4a',
                  borderRadius: 8,
                  padding: '12px 16px',
                  color: '#e6e9ef',
                  fontSize: 13,
                  maxWidth: 320,
                  zIndex: 1000,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  whiteSpace: 'pre-line',
                }}>
                  {getRatioTooltip().split('\n').map((line, i) => (
                    <p key={i} style={{ margin: i === 0 ? 0 : '8px 0 0', color: i === 0 ? '#e6e9ef' : '#c1c7d0' }}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ borderRadius: 8, background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.3)', padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
                Entradas
              </p>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#4ADE80', margin: 0 }}>
                +{CURRENCY_SYMBOLS[selectedCurrency]} {aggregated.byCurrency[selectedCurrency].entradas.toLocaleString('es-AR')}
              </p>
              <p style={{ fontSize: 11, color: '#8bd9a5', margin: '4px 0 0' }}>Dinero recibido (Entregas)</p>
            </div>
            <div style={{ borderRadius: 8, background: 'rgba(255, 138, 122, 0.08)', border: '1px solid rgba(255, 138, 122, 0.3)', padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#ff8a7a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
                Salidas
              </p>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#ff8a7a', margin: 0 }}>
                -{CURRENCY_SYMBOLS[selectedCurrency]} {aggregated.byCurrency[selectedCurrency].salidas.toLocaleString('es-AR')}
              </p>
              <p style={{ fontSize: 11, color: '#d9a89e', margin: '4px 0 0' }}>Dinero entregado (Retiros)</p>
            </div>
          </div>
        </div>
      )}

      {/* GRÁFICO DIARIO */}
      {selectedCurrency && dataByDate.length > 0 && (
        <div style={{ background: '#1e2128', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e6e9ef', margin: '0 0 16px' }}>Flujo de Efectivo Diario</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {dataByDate.map((day, idx) => {
              const entradasPercent = (day.entradas / maxDailyValue) * 100;
              const salidasPercent = (day.salidas / maxDailyValue) * 100;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 52, textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#c1c7d0' }}>{day.date}</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3, height: 20 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <div
                        style={{
                          height: 12,
                          width: `${Math.max(entradasPercent, 0.5)}%`,
                          minWidth: day.entradas > 0 ? 4 : 0,
                          background: 'linear-gradient(90deg, #10B981, #4ADE80)',
                          borderRadius: 2,
                          transition: 'width 0.3s',
                        }}
                      />
                      <span style={{ fontSize: 10, color: '#4ADE80', fontWeight: 600, marginLeft: 2 }}>
                        {day.entradas > 0 ? `${CURRENCY_SYMBOLS[selectedCurrency]}${(day.entradas/1000).toFixed(1)}k` : ''}
                      </span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <div
                        style={{
                          height: 12,
                          width: `${Math.max(salidasPercent, 0.5)}%`,
                          minWidth: day.salidas > 0 ? 4 : 0,
                          background: 'linear-gradient(90deg, #EF4444, #ff8a7a)',
                          borderRadius: 2,
                          transition: 'width 0.3s',
                        }}
                      />
                      <span style={{ fontSize: 10, color: '#ff8a7a', fontWeight: 600, marginLeft: 2 }}>
                        {day.salidas > 0 ? `${CURRENCY_SYMBOLS[selectedCurrency]}${(day.salidas/1000).toFixed(1)}k` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#4ADE80' }} />
              <span style={{ fontSize: 11, color: '#c1c7d0' }}>Entradas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#ff8a7a' }} />
              <span style={{ fontSize: 11, color: '#c1c7d0' }}>Salidas</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DETALLE DE ASIENTOS CON EXPANSIÓN Y CARGA DE DATOS */}
      {/* ============================================================ */}
      {ledgers && ledgers.length > 0 && selectedCurrency && aggregated.byCurrency[selectedCurrency] && (
        <div style={{ background: '#1e2128', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e6e9ef', margin: '0 0 24px' }}>Detalle de Asientos</h3>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {ledgers.map(ledger => {
              const groups = ledger.byCurrency as CurrencyGroup[];
              const currencyGroup = groups.find((g: CurrencyGroup) => g.currency === selectedCurrency);
              if (!currencyGroup || currencyGroup.lines.length === 0) return null;

              const [y, m, d] = ledger.date.split('-').map(Number);
              const dateObj = new Date(y, m - 1, d);
              const dateStr = dateObj.toLocaleDateString('es-AR', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div key={ledger.date} style={{ background: '#2c303a', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e6e9ef', margin: '0 0 12px' }}>{dateStr}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {currencyGroup.lines.map((line: Line, idx: number) => {
                      const isEntrada = line.concepto === 'Entrega' || line.concepto.toLowerCase().includes('entrega');
                      const lineId = `${ledger.date}-${line.operationId}-${idx}`;
                      const isExpanded = expandedLines.has(lineId);
                      const opDetails = operationDetails[line.operationId];
                      const isLoadingDetails = loadingDetails[line.operationId];

                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {/* FILA PRINCIPAL */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: 13,
                              padding: '8px 12px',
                              borderRadius: 6,
                              background: 'rgba(255,255,255,0.03)',
                              cursor: 'pointer',
                            }}
                            onClick={() => toggleExpand(lineId, line.operationId)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  flexShrink: 0,
                                  backgroundColor: isEntrada ? '#4ADE80' : '#ff8a7a',
                                }}
                              />
                              <div>
                                <p style={{ fontWeight: 600, color: '#e6e9ef', margin: 0 }}>#{line.operationId.slice(-3).toUpperCase()}</p>
                                <p style={{ fontSize: 12, color: '#8b93a3', margin: 0 }}>{line.concepto}</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <p style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e6e9ef', margin: 0 }}>
                                {isEntrada ? '+' : '-'}
                                {CURRENCY_SYMBOLS[selectedCurrency]} {Number(line.valorFinal).toLocaleString('es-AR')}
                              </p>
                              <button
                                type="button"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#8b93a3',
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  fontSize: 12,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(lineId, line.operationId);
                                }}
                              >
                                {isExpanded ? 'Ver menos' : 'Ver más'}
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </div>

                          {/* DETALLE EXPANDIDO (con carga dinámica) */}
                          {isExpanded && (
                            <div
                              style={{
                                marginLeft: 32,
                                padding: '12px 16px',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: 6,
                                borderLeft: '2px solid #3a3f4a',
                                fontSize: 13,
                                color: '#c1c7d0',
                              }}
                            >
                              {isLoadingDetails ? (
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                  <span>Cargando detalles...</span>
                                </div>
                              ) : opDetails ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                                  <div><strong>Tipo:</strong> {opDetails.tipo}</div>
                                  <div>
                                    <strong>Monto:</strong> {CURRENCY_SYMBOLS[opDetails.moneda]} {Number(opDetails.monto).toLocaleString('es-AR')}
                                  </div>
                                  <div><strong>Moneda:</strong> {opDetails.moneda}</div>
                                  <div>
                                    <strong>Modalidad:</strong> {opDetails.modalidad === 'domicilio' ? 'Calle' : opDetails.modalidad}
                                  </div>
                                  {opDetails.direccion && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                      <strong>Dirección:</strong> {opDetails.direccion}
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opDetails.direccion)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#3b82f6', marginLeft: 8, textDecoration: 'underline', fontSize: 12 }}
                                      >
                                        Ver en Google Maps
                                      </a>
                                    </div>
                                  )}
                                  <div>
                                    <strong>Fecha / Hora:</strong> {new Date(opDetails.createdAt).toLocaleString('es-AR')}
                                  </div>
                                  <div><strong>Contacto:</strong> {opDetails.contacto}</div>
                                  <div><strong>Teléfono:</strong> {opDetails.telefono || 'No disponible'}</div>
                                  <div><strong>Cadete:</strong> {opDetails.cadete?.nombre || 'Sin asignar'}</div>
                                  <div><strong>Estado:</strong> {opDetails.status}</div>
                                </div>
                              ) : (
                                <div style={{ textAlign: 'center', padding: '20px 0', color: '#8b93a3' }}>
                                  No se pudieron cargar los detalles
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ledgers && ledgers.length === 0 && (
        <div style={{ background: '#1e2128', borderRadius: 12, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#c0c6d0', fontSize: 15, fontWeight: 500 }}>
            No hay datos para el período seleccionado
          </p>
          <p style={{ margin: '8px 0 0', color: '#8b93a3', fontSize: 13 }}>
            Intenta con otro período o crea nuevas operaciones
          </p>
        </div>
      )}
    </div>
  );
}