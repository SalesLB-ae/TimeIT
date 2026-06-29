'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as db from '@/lib/db';
import type { Project, TimeEntry } from '@/lib/types';
import * as Fmt from '@/lib/format';

type Range = 'day' | 'week' | 'month';

function rangeStart(range: Range): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === 'week') {
    const day = (d.getDay() + 6) % 7; // Monday start
    d.setDate(d.getDate() - day);
  } else if (range === 'month') {
    d.setDate(1);
  }
  return d.getTime();
}

interface Row {
  name: string;
  color: string;
  ms: number;
}

export function ReportsClient({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [range, setRange] = useState<Range>('week');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const since = new Date(rangeStart(range)).toISOString();
    const [data, projs] = await Promise.all([
      db.fetchMyEntriesSince(supabase, userId, since),
      db.fetchProjects(supabase),
    ]);
    setEntries(data);
    setProjects(projs);
    setLoading(false);
  }, [supabase, userId, range]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Your time grouped by project.
  const { total, rows } = useMemo(() => {
    const projectById = new Map(projects.map((p) => [p.id, p]));
    let total = 0;
    const acc = new Map<string, Row>();
    for (const e of entries) {
      if (!e.ended_at) continue;
      const ms = new Date(e.ended_at).getTime() - new Date(e.started_at).getTime();
      total += ms;
      const p = e.project_id ? projectById.get(e.project_id) : undefined;
      const key = e.project_id ?? 'none';
      const existing = acc.get(key);
      if (existing) existing.ms += ms;
      else acc.set(key, { name: p?.name ?? 'No project', color: p?.color ?? '#99a3ad', ms });
    }
    return { total, rows: Array.from(acc.values()).sort((a, b) => b.ms - a.ms) };
  }, [entries, projects]);

  function exportCsv() {
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const rowsCsv = [['Project', 'Description', 'Start', 'End', 'Duration (h)']];
    for (const e of entries) {
      if (!e.ended_at) continue;
      const hours = (
        (new Date(e.ended_at).getTime() - new Date(e.started_at).getTime()) / 3600000
      ).toFixed(2);
      rowsCsv.push([
        (e.project_id && projectById.get(e.project_id)?.name) || '',
        e.description || '',
        new Date(e.started_at).toLocaleString(),
        new Date(e.ended_at).toLocaleString(),
        hours,
      ]);
    }
    const csv = rowsCsv.map((r) => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeit-${range}-${Fmt.dayKey(Date.now())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="view">
      <div className="page-head">
        <div className="page-title">Reports</div>
      </div>
      <div className="report-controls">
        <div className="range-picker">
          {(['day', 'week', 'month'] as Range[]).map((r) => (
            <button
              key={r}
              className={'chip' + (range === r ? ' is-active' : '')}
              onClick={() => setRange(r)}
            >
              {r === 'day' ? 'Today' : r === 'week' ? 'This week' : 'This month'}
            </button>
          ))}
        </div>
        <button className="link-btn" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div className="report-total glass">
        <span className="report-total-label">Your total</span>
        <span className="report-total-value">{Fmt.duration(total)}</span>
      </div>

      <div className="report-breakdown">
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : total === 0 ? (
          <p className="empty-state">No time tracked in this range yet.</p>
        ) : (
          rows.map((row) => (
            <div className="report-row glass" key={row.name}>
              <span className="entry-dot" style={{ background: row.color }} />
              <div className="report-bar-wrap">
                <div className="report-bar-top">
                  <span className="report-bar-name">{row.name}</span>
                  <span className="report-bar-time">
                    {Fmt.durationShort(row.ms)} · {Math.round((row.ms / total) * 100)}%
                  </span>
                </div>
                <div className="report-bar">
                  <div
                    className="report-bar-fill"
                    style={{ width: (row.ms / total) * 100 + '%', background: row.color }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function csvCell(value: string): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
