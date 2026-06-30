import { parseDurationToMinutes } from '@/lib/format';

// Minimal RFC-4180-ish CSV parser (handles quotes, escaped quotes, CRLF).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const n = text.length;
  for (let i = 0; i < n; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r') { /* ignore */ }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  // Drop fully-empty lines.
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

export interface ParsedEntry {
  project: string;
  description: string;
  startMs: number;
  endMs: number;
  valid: boolean;
  error?: string;
}

function findCol(headers: string[], predicate: (h: string) => boolean): number {
  return headers.findIndex((h) => predicate(h));
}

function toMs(value: string): number {
  if (!value) return NaN;
  return new Date(value).getTime();
}

// Map parsed rows to entries, auto-detecting columns. Supports:
//  - Clockify: "Start Date"+"Start Time"+"End Date"+"End Time" (+ Duration)
//  - Generic: "Start"/"End" datetime columns (+ optional Duration)
export function mapEntries(rows: string[][]): { headers: string[]; entries: ParsedEntry[] } {
  if (rows.length < 2) return { headers: rows[0] ?? [], entries: [] };
  const headers = rows[0].map((h) => h.trim());
  const lower = headers.map((h) => h.toLowerCase());

  const has = (s: string) => (h: string) => h.includes(s);
  const iDesc = findCol(lower, has('description'));
  const iProject = findCol(lower, has('project'));
  const iStartDate = findCol(lower, (h) => h.includes('start') && h.includes('date'));
  const iStartTime = findCol(lower, (h) => h.includes('start') && h.includes('time'));
  const iEndDate = findCol(lower, (h) => h.includes('end') && h.includes('date'));
  const iEndTime = findCol(lower, (h) => h.includes('end') && h.includes('time'));
  const iStart = findCol(lower, (h) => h === 'start');
  const iEnd = findCol(lower, (h) => h === 'end');
  const iDur = findCol(lower, has('duration'));
  const durIsDecimal = iDur >= 0 && lower[iDur].includes('decimal');

  const entries: ParsedEntry[] = rows.slice(1).map((cells) => {
    const get = (i: number) => (i >= 0 && i < cells.length ? cells[i].trim() : '');

    let startMs = NaN;
    if (iStartDate >= 0 && iStartTime >= 0) startMs = toMs(`${get(iStartDate)} ${get(iStartTime)}`);
    else if (iStart >= 0) startMs = toMs(get(iStart));

    let endMs = NaN;
    if (iEndDate >= 0 && iEndTime >= 0) endMs = toMs(`${get(iEndDate)} ${get(iEndTime)}`);
    else if (iEnd >= 0) endMs = toMs(get(iEnd));

    // Fall back to start + duration when no end is given.
    if ((isNaN(endMs)) && iDur >= 0 && !isNaN(startMs)) {
      const raw = get(iDur);
      const mins = durIsDecimal ? Math.round(parseFloat(raw) * 60) : parseDurationToMinutes(raw);
      if (mins != null && !isNaN(mins)) endMs = startMs + mins * 60_000;
    }

    const description = get(iDesc);
    const project = get(iProject);

    let error: string | undefined;
    if (isNaN(startMs)) error = 'Unreadable start time';
    else if (isNaN(endMs)) error = 'Missing/unreadable end (or duration)';
    else if (endMs <= startMs) error = 'End is not after start';

    return { project, description, startMs, endMs, valid: !error, error };
  });

  return { headers, entries };
}
