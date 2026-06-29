// Date helpers for the calendar views. All boundaries are LOCAL time.

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

// Date -> "YYYY-MM-DD" (local)
export function ymd(d: Date): string {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// "YYYY-MM-DD" -> Date at local midnight
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// The [start, end) ISO instants covering one local calendar day.
export function dayRange(dateStr: string): { startIso: string; endIso: string } {
  const start = parseYmd(dateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

// A 6-week (42-cell) grid starting on Monday that contains the given month.
export function monthMatrix(year: number, monthIndex: number): Date[] {
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() + 6) % 7; // days since Monday
  const start = new Date(year, monthIndex, 1 - offset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return cells;
}

// [start, end) ISO instants spanning the whole visible matrix.
export function matrixRange(year: number, monthIndex: number): { startIso: string; endIso: string } {
  const cells = monthMatrix(year, monthIndex);
  const start = cells[0];
  const end = new Date(cells[41]);
  end.setDate(end.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
