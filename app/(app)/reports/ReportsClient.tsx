'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as db from '@/lib/db';
import type { Project, Team, TimeEntry } from '@/lib/types';
import * as Fmt from '@/lib/format';
import { ImportModal } from '@/components/ImportModal';

type Range = 'day' | 'week' | 'month';

// Compute the period [start, end) and a label for the chosen range + offset
// (offset 0 = current; negative = past).
function period(range: Range, offset: number): { start: Date; end: Date; label: string } {
  if (range === 'day') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + offset);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {
      start,
      end,
      label: start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  }
  if (range === 'week') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const dow = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dow + offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const last = new Date(end);
    last.setDate(last.getDate() - 1);
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { start, end, label: `${fmt(start)} – ${fmt(last)}` };
  }
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { start, end, label: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) };
}

interface Row {
  name: string;
  color: string;
  ms: number;
}

export function ReportsClient({ userId, myTeam }: { userId: string; myTeam: Team | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [range, setRange] = useState<Range>('week');
  const [offset, setOffset] = useState(0);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const { start, end, label } = useMemo(() => period(range, offset), [range, offset]);

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

  useEffect(() => {
    reload();
  }, [reload]);

  function setRangeReset(r: Range) {
    setRange(r);
    setOffset(0);
  }

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
    a.download = `timeit-${range}-${Fmt.dayKey(start.getTime())}.csv`;
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
          {(['day', 'week', 'month'] as Range[]).map((r) => (
            <button
              key={r}
              className={'chip' + (range === r ? ' is-active' : '')}
              onClick={() => setRangeReset(r)}
            >
              {r === 'day' ? 'Day' : r === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
        {/* Move between dates / weeks / months */}
        <div className="period-nav">
          <button className="cal-nav" onClick={() => setOffset((o) => o - 1)} aria-label="Previous">‹</button>
          <span className="period-label">{label}</span>
          <button
            className="cal-nav"
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={offset >= 0}
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </div>

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

      {importing && (
        <ImportModal
          userId={userId}
          myTeam={myTeam}
          projects={projects}
          onClose={() => setImporting(false)}
          onImported={() => {
            setImporting(false);
            reload();
          }}
        />
      )}
    </section>
  );
}

function csvCell(value: string): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
