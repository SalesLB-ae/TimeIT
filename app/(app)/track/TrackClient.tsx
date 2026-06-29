'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as db from '@/lib/db';
import type { Project, TimeEntry } from '@/lib/types';
import * as Fmt from '@/lib/format';
import { teamMeta } from '@/lib/teams';
import { EntryModal, type EntryDraft } from '@/components/EntryModal';

export function TrackClient({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [now, setNow] = useState(() => Date.now());

  const [modalEntry, setModalEntry] = useState<EntryDraft | null>(null);
  const descRef = useRef<HTMLInputElement>(null);

  const running = entries.find((e) => e.ended_at === null) ?? null;

  const reload = useCallback(async () => {
    const [p, e] = await Promise.all([
      db.fetchProjects(supabase),
      db.fetchMyEntries(supabase, userId),
    ]);
    setProjects(p);
    setEntries(e);
    if (!projectId && p.length) setProjectId(p[0].id);
    setLoading(false);
  }, [supabase, userId, projectId]);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick the running readout once per second + keep the tab title live.
  useEffect(() => {
    if (!running) {
      document.title = 'TimeIT — team time tracking';
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    setNow(Date.now());
    return () => clearInterval(id);
  }, [running?.id]);

  useEffect(() => {
    if (running) {
      const elapsed = now - new Date(running.started_at).getTime();
      document.title = Fmt.duration(elapsed) + ' · TimeIT';
    }
  }, [now, running]);

  // Reflect the running entry into the inputs.
  useEffect(() => {
    if (running) {
      if (document.activeElement !== descRef.current) setDescription(running.description);
      setProjectId(running.project_id ?? projectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running?.id]);

  async function toggleTimer() {
    if (running) {
      await db.stopTimer(supabase, running.id);
    } else {
      await db.startTimer(supabase, userId, description, projectId || null);
      setDescription('');
    }
    await reload();
  }

  // Persist description/project edits while the timer runs (debounced-ish on blur/change).
  async function commitRunningDescription() {
    if (running && running.description !== description) {
      await db.updateEntry(supabase, running.id, { description });
    }
  }
  async function changeProject(value: string) {
    setProjectId(value);
    if (running) {
      await db.updateEntry(supabase, running.id, { project_id: value || null });
      await reload();
    }
  }

  async function resume(entry: TimeEntry) {
    await db.startTimer(supabase, userId, entry.description, entry.project_id);
    setDescription('');
    await reload();
  }

  async function saveModal(draft: EntryDraft) {
    if (draft.id) {
      await db.updateEntry(supabase, draft.id, {
        description: draft.description,
        project_id: draft.projectId || null,
        started_at: new Date(draft.start).toISOString(),
        ended_at: new Date(draft.end).toISOString(),
      });
    } else {
      await db.addManualEntry(
        supabase,
        userId,
        draft.description,
        draft.projectId || null,
        new Date(draft.start).toISOString(),
        new Date(draft.end).toISOString()
      );
    }
    setModalEntry(null);
    await reload();
  }

  async function deleteFromModal(id: string) {
    await db.deleteEntry(supabase, id);
    setModalEntry(null);
    await reload();
  }

  const completed = entries.filter((e) => e.ended_at !== null);
  const groups = groupByDay(completed);
  const runningElapsed = running ? now - new Date(running.started_at).getTime() : 0;

  return (
    <section className="view">
      <div className="page-head">
        <div className="page-title">Track</div>
      </div>
      <div className="timer-card glass">
        <input
          ref={descRef}
          type="text"
          className="timer-input"
          placeholder="What are you working on?"
          value={description}
          autoComplete="off"
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitRunningDescription}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              toggleTimer();
            }
          }}
        />
        <div className="timer-controls">
          <select
            className="project-select"
            value={projectId}
            onChange={(e) => changeProject(e.target.value)}
            aria-label="Project"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="timer-readout">{Fmt.duration(runningElapsed)}</div>
          <button
            className={'start-btn' + (running ? ' is-running' : '')}
            onClick={toggleTimer}
            aria-label={running ? 'Stop timer' : 'Start timer'}
          >
            <span>{running ? '■' : '▶'}</span>
          </button>
        </div>
      </div>

      <div className="manual-add">
        <button
          className="link-btn"
          onClick={() =>
            setModalEntry({
              id: null,
              description: '',
              projectId: projects[0]?.id ?? '',
              start: Fmt.toDatetimeLocal(Date.now() - 3600000),
              end: Fmt.toDatetimeLocal(Date.now()),
            })
          }
        >
          + Add time manually
        </button>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : completed.length === 0 ? (
        <p className="empty-state">No time tracked yet. Hit ▶ to start your first timer.</p>
      ) : (
        <div className="entries-list">
          {groups.map((group) => (
            <div className="day-group" key={group.key}>
              <div className="day-header">
                <span>{Fmt.dayLabel(group.entries[0].startMs)}</span>
                <span className="day-total">{Fmt.durationShort(group.total)}</span>
              </div>
              {group.entries.map((e) => {
                const project = projects.find((p) => p.id === e.project_id) ?? null;
                const meta = teamMeta(project?.team);
                return (
                  <div
                    className="entry glass"
                    key={e.id}
                    onClick={() =>
                      setModalEntry({
                        id: e.id,
                        description: e.description,
                        projectId: e.project_id ?? '',
                        start: Fmt.toDatetimeLocal(e.startMs),
                        end: Fmt.toDatetimeLocal(e.endMs),
                      })
                    }
                  >
                    <span
                      className="entry-dot"
                      style={{ background: project ? project.color : '#999' }}
                    />
                    <div className="entry-main">
                      <div className={'entry-desc' + (e.description ? '' : ' is-empty')}>
                        {e.description || 'No description'}
                      </div>
                      <div className="entry-meta">
                        <span>
                          {(project ? project.name + ' · ' : '') +
                            Fmt.clockTime(e.startMs) +
                            ' – ' +
                            Fmt.clockTime(e.endMs)}
                        </span>
                        {meta && (
                          <span className="team-badge" style={{ color: meta.color, background: meta.tint }}>
                            {meta.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="entry-duration">{Fmt.duration(e.endMs - e.startMs)}</span>
                    <button
                      className="entry-resume"
                      title="Resume this task"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        resume(e);
                      }}
                    >
                      ▶
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {modalEntry && (
        <EntryModal
          draft={modalEntry}
          projects={projects}
          onSave={saveModal}
          onDelete={deleteFromModal}
          onClose={() => setModalEntry(null)}
        />
      )}
    </section>
  );
}

type DayEntry = TimeEntry & { startMs: number; endMs: number };

function groupByDay(entries: TimeEntry[]) {
  const withMs: DayEntry[] = entries.map((e) => ({
    ...e,
    startMs: new Date(e.started_at).getTime(),
    endMs: e.ended_at ? new Date(e.ended_at).getTime() : Date.now(),
  }));
  const map = new Map<string, DayEntry[]>();
  for (const e of withMs) {
    const key = Fmt.dayKey(e.startMs);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([key, es]) => ({
    key,
    entries: es,
    total: es.reduce((s, e) => s + (e.endMs - e.startMs), 0),
  }));
}
