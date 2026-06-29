// Pure formatting helpers shared across views.

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

// Duration in ms -> "H:MM:SS"
export function duration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h + ':' + pad(m) + ':' + pad(s);
}

// Duration in ms -> "1h 23m" (compact, for totals)
export function durationShort(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return h + 'h ' + m + 'm';
  if (h) return h + 'h';
  return m + 'm';
}

export function clockTime(ms: number): string {
  const d = new Date(ms);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + pad(m) + ' ' + ampm;
}

export function dayKey(ms: number): string {
  const d = new Date(ms);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

export function dayLabel(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (dayKey(ms) === dayKey(today.getTime())) return 'Today';
  if (dayKey(ms) === dayKey(yest.getTime())) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// ms -> value for <input type="datetime-local"> (local time, no TZ suffix).
export function toDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  );
}

export function fromDatetimeLocal(value: string): number {
  return new Date(value).getTime();
}
