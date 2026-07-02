'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  fetchMyEntriesBetween,
  fetchProjects,
  addManualEntry,
  updateEntry,
  deleteEntry,
} from '@/lib/db';
import type { Project, TimeEntry } from '@/lib/types';
import { teamMeta } from '@/lib/teams';
import * as Fmt from '@/lib/format';
import { ymd, parseYmd, dayRange } from '@/lib/calendar';
import { EntryModal, type EntryDraft } from '@/components/EntryModal';
import { MiniCalendar } from '@/components/MiniCalendar';

export function CalendarClient({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useSearchParams();
  const dateStr = params.get('date') || ymd(new Date());

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<EntryDraft | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { startIso, endIso } = dayRange(dateStr);
    const [data, projs] = await Promise.all([
      fetchMyEntriesBetween(supabase, userId, startIso, endIso),
      fetchProjects(supabase),
    ]);
    setEntries(data);
    setProjects(projs);
    setLoading(false);
  }, [supabase, userId, dateStr]);

  useEffect(() => {
    reload();
  }, [reload]);

  function goDay(offset: number) {
    const d = parseYmd(dateStr);
    d.setDate(d.getDate() + offset);
    router.push(`/calendar?date=${ymd(d)}`);
  }

  // "Add time" defaults to a 1-hour block at 9am ON THE SELECTED DAY, so you can
  // backfill time you forgot to log on a specific date.
  function openAdd() {
    const base = parseYmd(dateStr);
    const start = new Date(base);
    start.setHours(9, 0, 0, 0);
    const end = new Date(base);
    end.setHours(10, 0, 0, 0);
    setModal({
      id: null,
      description: '',
      projectId: projects[0]?.id ?? '',
      taskId: '',
      start: Fmt.toDatetimeLocal(start.getTime()),
      end: Fmt.toDatetimeLocal(end.getTime()),
      tags: [],
      billable: false,
    });
  }

  function openEdit(e: TimeEntry) {
    setModal({
      id: e.id,
      description: e.description,
      projectId: e.project_id ?? '',
      taskId: e.task_id ?? '',
      start: Fmt.toDatetimeLocal(new Date(e.started_at).getTime()),
      end: Fmt.toDatetimeLocal(new Date(e.ended_at!).getTime()),
      tags: e.tags ?? [],
      billable: e.billable ?? false,
    });
  }

  async function save(draft: EntryDraft) {
    const startIso = new Date(draft.start).toISOString();
    const endIso = new Date(draft.end).toISOString();
    if (draft.id) {
      await updateEntry(supabase, draft.id, {
        description: draft.description,
        project_id: draft.projectId || null,
        task_id: draft.taskId || null,
        started_at: startIso,
        ended_at: endIso,
        tags: draft.tags,
        billable: draft.billable,
      });
    } else {
      await addManualEntry(
        supabase, userId, draft.description, draft.projectId || null, startIso, endIso,
        draft.tags, draft.billable, draft.taskId || null
      );
    }
    setModal(null);
    // The new entry may land on a different day than the one in view.
    const targetDay = ymd(new Date(startIso));
    if (targetDay !== dateStr) router.push(`/calendar?date=${targetDay}`);
    else await reload();
  }

  async function remove(id: string) {
    await deleteEntry(supabase, id);
    setModal(null);
    await reload();
  }

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const { sorted, dayTotal } = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );
    const dayTotal = sorted.reduce(
      (s, e) => s + (new Date(e.ended_at!).getTime() - new Date(e.started_at).getTime()),
      0
    );
    return { sorted, dayTotal };
  }, [entries]);

  const heading = parseYmd(dateStr).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <section className="view">
      <div className="page-head">
        <div className="page-title">{heading}</div>
        <div className="cal-day-controls">
          <button className="chip" onClick={() => goDay(-1)}>‹ Prev</button>
          <button className="chip" onClick={() => router.push(`/calendar?date=${ymd(new Date())}`)}>Today</button>
          <button className="chip" onClick={() => goDay(1)}>Next ›</button>
          <button className="btn-primary" onClick={openAdd}>+ Add time</button>
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar-aside">
          <MiniCalendar userId={userId} />
        </div>
        <div className="report-total glass">
          <span className="report-total-label">Your total this day</span>
          <span className="report-total-value">{Fmt.duration(dayTotal)}</span>
        </div>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="empty-state">Nothing logged on this day yet. Use “+ Add time” to backfill it.</p>
      ) : (
        sorted.map((e) => {
          const project = e.project_id ? projectById.get(e.project_id) : undefined;
          const meta = teamMeta(project?.team);
          const start = new Date(e.started_at).getTime();
          const end = new Date(e.ended_at!).getTime();
          return (
            <div className="entry glass" key={e.id} onClick={() => openEdit(e)}>
              <span className="entry-dot" style={{ background: project?.color ?? '#99a3ad' }} />
              <div className="entry-main">
                <div className={'entry-desc' + (e.description ? '' : ' is-empty')}>
                  {e.description || 'No description'}
                </div>
                <div className="entry-meta">
                  <span>
                    {(project ? project.name + ' · ' : '') +
                      Fmt.clockTime(start) + ' – ' + Fmt.clockTime(end)}
                  </span>
                  {meta && (
                    <span className="team-badge" style={{ color: meta.color, background: meta.tint }}>
                      {meta.label}
                    </span>
                  )}
                </div>
              </div>
              <span className="entry-duration">{Fmt.duration(end - start)}</span>
            </div>
          );
        })
      )}

      {modal && (
        <EntryModal
          draft={modal}
          projects={projects}
          onSave={save}
          onDelete={remove}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  );
}
