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

// ms -> "H:MM" for an editable duration field.
export function durationHM(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  return Math.floor(totalMin / 60) + ':' + pad(totalMin % 60);
}

// Parse flexible duration input -> minutes (or null if unparseable).
// Accepts: "1:30", "1:30:00", "1h 30m", "90m", "1.5h", "1h", "90".
export function parseDurationToMinutes(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // H:MM or H:MM:SS
  const colon = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colon) {
    const h = +colon[1];
    const m = +colon[2];
    const sec = colon[3] ? +colon[3] : 0;
    if (m > 59 || sec > 59) return null;
    return h * 60 + m + Math.round(sec / 60);
  }

  // 1h 30m / 1h / 30m  (also "1.5h")
  const hm = s.match(/^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/);
  if (hm && (hm[1] || hm[2])) {
    const h = hm[1] ? parseFloat(hm[1]) : 0;
    const m = hm[2] ? parseInt(hm[2], 10) : 0;
    return Math.round(h * 60) + m;
  }

  // bare number = minutes
  if (/^\d+$/.test(s)) return parseInt(s, 10);

  return null;
}
