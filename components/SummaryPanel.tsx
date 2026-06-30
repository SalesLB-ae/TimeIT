'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchMyEntriesSince, fetchProjects } from '@/lib/db';
import * as Fmt from '@/lib/format';

interface Stats {
  today: number;
  week: number;
  topName: string | null;
  topMs: number;
  streak: number;
}

// Productivity summary shown in the sidebar (replaces the mini calendar on
// the Track page). Refreshes on focus and on a light interval.
export function SummaryPanel({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 60);
    const [entries, projects] = await Promise.all([
      fetchMyEntriesSince(supabase, userId, since.toISOString()),
      fetchProjects(supabase),
    ]);

    const todayKey = Fmt.dayKey(Date.now());
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const dow = (startToday.getDay() + 6) % 7;
    const weekStart = new Date(startToday);
    weekStart.setDate(weekStart.getDate() - dow);

    let today = 0;
    let week = 0;
    const projMs = new Map<string, number>();
    const daysWith = new Set<string>();

    for (const e of entries) {
      if (!e.ended_at) continue;
      const s = new Date(e.started_at).getTime();
      const ms = new Date(e.ended_at).getTime() - s;
      daysWith.add(Fmt.dayKey(s));
      if (Fmt.dayKey(s) === todayKey) today += ms;
      if (s >= weekStart.getTime()) {
        week += ms;
        if (e.project_id) projMs.set(e.project_id, (projMs.get(e.project_id) ?? 0) + ms);
      }
    }

    let topId: string | null = null;
    let topMs = 0;
    projMs.forEach((v, k) => {
      if (v > topMs) { topMs = v; topId = k; }
    });
    const topName = topId ? projects.find((p) => p.id === topId)?.name ?? null : null;

    // Consecutive days with tracked time, ending today (or yesterday).
    let streak = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (!daysWith.has(Fmt.dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
    while (daysWith.has(Fmt.dayKey(d.getTime()))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    setStats({ today, week, topName, topMs, streak });
  }, [supabase, userId]);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    const id = setInterval(load, 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(id);
    };
  }, [load]);

  return (
    <div className="summary glass">
      <div className="summary-item">
        <div className="summary-label">Today</div>
        <div className="summary-value">{stats ? Fmt.durationShort(stats.today) : '—'}</div>
        <div className="summary-sub">tracked</div>
      </div>
      <div className="summary-item">
        <div className="summary-label">This week</div>
        <div className="summary-value">{stats ? Fmt.durationShort(stats.week) : '—'}</div>
      </div>
      <div className="summary-item">
        <div className="summary-label">Top project</div>
        <div className="summary-value summary-value--sm">{stats?.topName ?? '—'}</div>
        {stats?.topName && <div className="summary-sub">{Fmt.durationShort(stats.topMs)}</div>}
      </div>
      <div className="summary-item">
        <div className="summary-label">Daily streak</div>
        <div className="summary-value">
          {stats ? stats.streak : '—'} <span className="summary-unit">{stats?.streak === 1 ? 'day' : 'days'}</span>
        </div>
      </div>
    </div>
  );
}
