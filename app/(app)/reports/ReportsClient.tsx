'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as db from '@/lib/db';
import type { Project, Team, TimeEntry } from '@/lib/types';
import * as Fmt from '@/lib/format';
import { ImportModal } from '@/components/ImportModal';

type Preset =
  | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This Week' },
  { key: 'last_week', label: 'Last Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'custom', label: 'Custom' },
];

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

// [start, end) for a preset (or custom from/to YYYY-MM-DD).
function periodFor(preset: Preset, from: string, to: string): { start: Date; end: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayAfter = (d: Date) => { const e = new Date(d); e.setDate(e.getDate() + 1); return e; };

  switch (preset) {
    case 'today': return { start: today, end: dayAfter(today) };
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { start: y, end: today };
    }
    case 'this_week': {
      const s = startOfWeek(today); const e = new Date(s); e.setDate(e.getDate() + 7);
      return { start: s, end: e };
    }
    case 'last_week': {
      const s = startOfWeek(today); s.setDate(s.getDate() - 7);
      const e = new Date(s); e.setDate(e.getDate() + 7);
      return { start: s, end: e };
    }
    case 'this_month':
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 1) };
    case 'last_month':
      return { start: new Date(today.getFullYear(), today.getMonth() - 1, 1), end: new Date(today.getFullYear(), today.getMonth(), 1) };
    case 'custom': {
      const s = from ? new Date(from + 'T00:00') : today;
      const e = to ? new Date(to + 'T00:00') : today;
      e.setDate(e.getDate() + 1);
      return { start: s, end: e };
    }
  }
}

interface Row { name: string; color: string; ms: number }

export function ReportsClient({ userId, myTeam }: { userId: string; myTeam: Team | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [preset, setPreset] = useState<Preset>('this_week');
  const [from, setFrom] = useState(Fmt.dayKey(Date.now()));
  const [to, setTo] = useState(Fmt.dayKey(Date.now()));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const { start, end } = useMemo(() => periodFor(preset, from, to), [preset, from, to]);

  const reload = useCallback(async () => {
    setLoading(true);
    const [data, projs] = await Promise.all([
      db.fetchMyEntriesBetween(supabase, userId, start.toISOString(), end.toISOString()),
      db.fetchProjects(supabase),
    ]);
    setEntries(data);
    setProjects(projs);
    setLoading(false);
  }, [supabase, userId, start, end]);

  useEffect(() => { reload(); }, [reload]);

  const { total, rows } = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, p]));
    let total = 0;
    const acc = new Map<string, Row>();
    for (const e of entries) {
      if (!e.ended_at) continue;
      const ms = new Date(e.ended_at).getTime() - new Date(e.started_at).getTime();
      total += ms;
      const p = e.project_id ? byId.get(e.project_id) : undefined;
      const key = e.project_id ?? 'none';
      const ex = acc.get(key);
      if (ex) ex.ms += ms;
      else acc.set(key, { name: p?.name ?? 'No project', color: p?.color ?? '#99a3ad', ms });
    }
    return { total, rows: Array.from(acc.values()).sort((a, b) => b.ms - a.ms) };
  }, [entries, projects]);

  function exportCsv() {
    const byId = new Map(projects.map((p) => [p.id, p]));
    const rowsCsv = [['Project', 'Description', 'Tags', 'Billable', 'Start', 'End', 'Duration (h)']];
    for (const e of entries) {
      if (!e.ended_at) continue;
      const hours = ((new Date(e.ended_at).getTime() - new Date(e.started_at).getTime()) / 3600000).toFixed(2);
      rowsCsv.push([
        (e.project_id && byId.get(e.project_id)?.name) || '',
        e.description || '',
        (e.tags ?? []).join('; '),
        e.billable ? 'Yes' : 'No',
        new Date(e.started_at).toISOString(),
        new Date(e.ended_at).toISOString(),
        hours,
      ]);
    }
    const csv = rowsCsv.map((r) => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeit-${preset}-${Fmt.dayKey(start.getTime())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="view">
      <div className="page-head">
        <div className="page-title">Reports</div>
        <div className="range-picker">
          <button className="link-btn" onClick={() => setImporting(true)}>Import CSV</button>
          <button className="link-btn" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <div className="report-controls">
        <div className="range-picker">
          {PRESETS.map((p) => (
            <button key={p.key} className={'chip chip-sm' + (preset === p.key ? ' is-active' : '')} onClick={() => setPreset(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {preset === 'custom' && (
        <div className="custom-range">
          <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      )}

      <div className="report-total glass">
        <span className="report-total-label">Your total</span>
        <span className="report-total-value">{Fmt.duration(total)}</span>
      </div>

      <div className="report-breakdown">
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : total === 0 ? (
          <p className="empty-state">No time tracked in this period.</p>
        ) : (
          rows.map((row) => (
            <div className="report-row glass" key={row.name}>
              <span className="entry-dot" style={{ background: row.color }} />
              <div className="report-bar-wrap">
                <div className="report-bar-top">
                  <span className="report-bar-name">{row.name}</span>
                  <span className="report-bar-time">{Fmt.durationShort(row.ms)} · {Math.round((row.ms / total) * 100)}%</span>
                </div>
                <div className="report-bar">
                  <div className="report-bar-fill" style={{ width: (row.ms / total) * 100 + '%', background: row.color }} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {importing && (
        <ImportModal
          userId={userId}
          myTeam={myTeam}
          projects={projects}
          onClose={() => setImporting(false)}
          onImported={() => { setImporting(false); reload(); }}
        />
      )}
    </section>
  );
}

function csvCell(value: string): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
