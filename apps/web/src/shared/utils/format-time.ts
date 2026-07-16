/**
 * Formatea una fecha como tiempo relativo en español, eligiendo la unidad
 * apropiada según cuánto pasó: "hace 5 min" / "hace 3 h" / "hace 2 d" / etc.
 *
 * Intl.RelativeTimeFormat con `numeric: 'auto'` por sí solo no decide la
 * unidad: si le pasás 240 minutos, dice "hace 240 minutos" en vez de "hace
 * 4 horas". Acá elegimos primero la unidad y después dejamos que Intl la
 * pluralice.
 */
const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export function formatRelativeTime(date: string | Date): string {
  const ms = new Date(date).getTime() - Date.now();
  const absSec = Math.abs(ms) / 1000;

  if (absSec < 60) return rtf.format(Math.round(ms / 1000), 'seconds');
  if (absSec < 3600) return rtf.format(Math.round(ms / 60_000), 'minutes');
  if (absSec < 86_400) return rtf.format(Math.round(ms / 3_600_000), 'hours');
  if (absSec < 7 * 86_400) return rtf.format(Math.round(ms / 86_400_000), 'days');
  if (absSec < 30 * 86_400) return rtf.format(Math.round(ms / (7 * 86_400_000)), 'weeks');
  if (absSec < 365 * 86_400) return rtf.format(Math.round(ms / (30 * 86_400_000)), 'months');
  return rtf.format(Math.round(ms / (365 * 86_400_000)), 'years');
}

/** Fecha y hora exacta en zona horaria de Buenos Aires (para tooltips/extras). */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
