const fechaLarga = new Intl.DateTimeFormat('es-DO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const fechaHora = new Intl.DateTimeFormat('es-DO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** "Miércoles, 23 de septiembre de 2026". */
export function formatLongDate(date: Date): string {
  const text = fechaLarga.format(date);
  return text.charAt(0).toLocaleUpperCase('es') + text.slice(1);
}

/** "23 sept 2026, 10:45"; devuelve el texto original si no es una fecha válida. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : fechaHora.format(date);
}

/** Fecha local en formato AAAA-MM-DD, para <input type="date">. */
export function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
