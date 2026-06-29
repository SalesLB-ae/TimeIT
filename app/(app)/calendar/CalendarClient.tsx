'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchTeamEntriesBetween, fetchProjects } from '@/lib/db';
import type { Project, TimeEntryWithUser } from '@/lib/types';
import { teamMeta } from '@/lib/teams';
import * as Fmt from '@/lib/format';
import { ymd, parseYmd, dayRange } from '@/lib/calendar';

interface PersonGroup {
  name: string;
  team: string | null;
  total: number;
  entries: TimeEntryWithUser[];
}

export function CalendarClient() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useSearchParams();
  const dateStr = params.get('date') || ymd(new Date());

  const [entries, setEntries] = useState<TimeEntryWithUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { startIso, endIso } = dayRange(dateStr);
    const [data, projs] = await Promise.all([
      fetchTeamEntriesBetween(supabase, startIso, endIso),
      fetchProjects(supabase),
    ]);
    setEntries(data);
    setProjects(projs);
    setLoading(false);
  }, [supabase, dateStr]);

  useEffect(() => {
    reload();
  }, [reload]);

  function goDay(offset: number) {
    const d = parseYmd(dateStr);
    d.setDate(d.getDate() + offset);
    router.push(`/calendar?date=${ymd(d)}`);
  }

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const { groups, dayTotal } = useMemo(() => {
    const map = new Map<string, PersonGroup>();
    let dayTotal = 0;
    for (const e of entries) {
      if (!e.ended_at) continue;
      const ms = new Date(e.ended_at).getTime() - new Date(e.started_at).getTime();
      dayTotal += ms;
      const name = e.profiles?.full_name || e.profiles?.email || 'Unknown';
      const key = name;
      if (!map.has(key)) map.set(key, { name, team: e.profiles?.team ?? null, total: 0, entries: [] });
      const g = map.get(key)!;
      g.total += ms;
      g.entries.push(e);
    }
    const groups = Array.from(map.values()).sort((a, b) => b.total - a.total);
    return { groups, dayTotal };
  }, [entries]);

  const heading = parseYmd(dateStr).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <section className="view">
      <div className="page-head">
        <div>
          <div className="page-title">{heading}</div>
        </div>
        <div className="cal-day-controls">
          <button className="chip" onClick={() => goDay(-1)}>‹ Prev</button>
          <button className="chip" onClick={() => router.push(`/calendar?date=${ymd(new Date())}`)}>Today</button>
          <button className="chip" onClick={() => goDay(1)}>Next ›</button>
        </div>
      </div>

      <div className="report-total glass">
        <span className="report-total-label">Team total this day</span>
        <span className="report-total-value">{Fmt.duration(dayTotal)}</span>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="empty-state">No time tracked by the team on this day.</p>
      ) : (
        groups.map((g) => {
          const meta = teamMeta(g.team);
          return (
            <div className="cal-person-group" key={g.name}>
              <div className="cal-person-head">
                <span className="cal-person-name">{g.name}</span>
                {meta ? (
                  <span className="team-badge" style={{ color: meta.color, background: meta.tint }}>
                    {meta.label}
                  </span>
                ) : (
                  <span className="team-badge is-none">No team</span>
                )}
                <span className="cal-person-total">{Fmt.durationShort(g.total)}</span>
              </div>
              {g.entries.map((e) => {
                const project = e.project_id ? projectById.get(e.project_id) : undefined;
                const start = new Date(e.started_at).getTime();
                const end = new Date(e.ended_at!).getTime();
                return (
                  <div className="entry glass" key={e.id} style={{ cursor: 'default' }}>
                    <span className="entry-dot" style={{ background: project?.color ?? '#99a3ad' }} />
                    <div className="entry-main">
                      <div className={'entry-desc' + (e.description ? '' : ' is-empty')}>
                        {e.description || 'No description'}
                      </div>
                      <div className="entry-meta">
                        {(project ? project.name + ' · ' : '') +
                          Fmt.clockTime(start) + ' – ' + Fmt.clockTime(end)}
                      </div>
                    </div>
                    <span className="entry-duration">{Fmt.duration(end - start)}</span>
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </section>
  );
}
