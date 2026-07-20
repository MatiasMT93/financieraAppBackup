import { useEffect, useRef, useState } from 'react';
import { CalendarIcon } from './CoordIcons.tsx';

const WEEKDAYS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseISO(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function buildGrid(viewDate: Date): Date[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  // Lunes=0 ... Domingo=6
  const firstWeekday = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

export default function CoordDatePicker({ value, onChange, id }: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const [viewDate, setViewDate] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function openPicker() {
    setViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setOpen((v) => !v);
  }

  const today = new Date();
  const todayISO = toISO(today);
  const days = buildGrid(viewDate);

  return (
    <div className="coord-datepicker" ref={rootRef}>
      <button type="button" id={id} className="coord-datepicker__trigger" onClick={openPicker}>
        <span>{value.split('-').reverse().join('/')}</span>
        <CalendarIcon />
      </button>

      {open && (
        <div className="coord-datepicker__popover" role="dialog" aria-label="Elegir fecha">
          <div className="coord-datepicker__header">
            <span className="coord-datepicker__month">
              {MONTHS[viewDate.getMonth()]} de {viewDate.getFullYear()}
            </span>
            <div className="coord-datepicker__nav">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              >
                ↓
              </button>
            </div>
          </div>

          <div className="coord-datepicker__weekdays">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>

          <div className="coord-datepicker__grid">
            {days.map((d) => {
              const iso = toISO(d);
              const outside = d.getMonth() !== viewDate.getMonth();
              return (
                <button
                  key={iso}
                  type="button"
                  className={[
                    iso === value ? 'is-selected' : '',
                    iso === todayISO ? 'is-today' : '',
                    outside ? 'is-outside' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="coord-datepicker__footer">
            <button type="button" onClick={() => { onChange(todayISO); setOpen(false); }}>Hoy</button>
          </div>
        </div>
      )}
    </div>
  );
}
