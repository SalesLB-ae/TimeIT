'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as db from '@/lib/db';
import type { Client, Project, Task, Team, TimeEntry } from '@/lib/types';
import * as Fmt from '@/lib/format';
import { EntryModal, type EntryDraft } from '@/components/EntryModal';
import { EntryRow, type EntrySaveFields } from '@/components/EntryRow';
import { ProjectPicker } from '@/components/ProjectPicker';

const ADD_NEW = '__add_new__';
type Scope = 'all' | 'today' | 'yesterday' | 'week';

function randomColor(seed: string): string {
  const palette = ['#2f6df6', '#2bb673', '#e5a23c', '#e5484d', '#6c5ce7', '#34b3c4', '#e36fb0'];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function TrackClient({ userId, myTeam }: { userId: string; myTeam: Team | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [composerTags, setComposerTags] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const [scope, setScope] = useState<Scope>('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterTask, setFilterTask] = useState('all');
  const [filterBillable, setFilterBillable] = useState(false);
  const [filterTag, setFilterTag] = useState('all');

  const [modalEntry, setModalEntry] = useState<EntryDraft | null>(null);
  const [pending, setPending] = useState<{ entry: TimeEntry; timer: ReturnType<typeof setTimeout> } | null>(null);
  const descRef = useRef<HTMLInputElement>(null);

  // The open entry (running OR paused) lives in the composer, not the list.
  const open = entries.find((e) => e.ended_at === null) ?? null;
  const isRunning = !!open && !!open.running_since;
  const isPaused = !!open && !open.running_since;

  const reload = useCallback(async () => {
    const [p, e, c, t] = await Promise.all([
      db.fetchProjects(supabase),
      db.fetchMyEntries(supabase, userId),
      db.fetchClients(supabase),
      db.fetchTasks(supabase),
    ]);
    setProjects(p);
    setEntries(e);
    setClients(c);
    setTasks(t);
    if (!projectId && p.length) setProjectId(p[0].id);
    setLoading(false);
  }, [supabase, userId, projectId]);

  const clientOf = useMemo(() => {
    const projClient = new Map(projects.map((p) => [p.id, p.client_id]));
    return (projectIdVal: string | null) => (projectIdVal ? projClient.get(projectIdVal) ?? null : null);
  }, [projects]);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live tick only while actually running (paused = frozen).
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    setNow(Date.now());
    return () => clearInterval(id);
  }, [isRunning, open?.running_since]);

  useEffect(() => {
    if (isRunning && open) document.title = Fmt.duration(Fmt.liveEntryMs(open, now)) + ' · TimeIT';
    else if (isPaused) document.title = 'Paused · TimeIT';
    else document.title = 'TimeIT — LeadersBrands Time Tracker';
  }, [now, isRunning, isPaused, open]);

  // Mirror the open entry into the composer.
  useEffect(() => {
    if (open) {
      if (document.activeElement !== descRef.current) setDescription(open.description);
      setProjectId(open.project_id ?? projectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.id]);

  // The client of the currently-selected project (auto-populated context).
  const composerClient = useMemo(() => {
    const p = projects.find((pr) => pr.id === projectId);
    return p ? clients.find((c) => c.id === p.client_id) ?? null : null;
  }, [projects, clients, projectId]);

  async function start() {
    const tags = composerTags.split(',').map((t) => t.trim()).filter(Boolean);
    await db.startTimer(supabase, userId, description, projectId || null, tags, taskId || null);
    setDescription('');
    setComposerTags('');
    setTaskId('');
    await reload();
  }
  async function stop() {
    if (open) await db.stopTimer(supabase, open);
    setDescription('');
    await reload();
  }
  async function pause() {
    if (open && isRunning) await db.pauseTimer(supabase, open);
    await reload();
  }
  async function resume() {
    if (open && isPaused) await db.resumeTimer(supabase, open.id);
    await reload();
  }

  async function changeProject(value: string) {
    if (value === ADD_NEW) {
      const name = window.prompt('New project / category name:')?.trim();
      if (!name) return;
      const created = await db.createProject(supabase, name, randomColor(name), userId, myTeam);
      await reload();
      setProjectId(created.id);
      if (open) await db.updateEntry(supabase, open.id, { project_id: created.id });
      return;
    }
    setProjectId(value);
    if (open) {
      await db.updateEntry(supabase, open.id, { project_id: value || null });
      await reload();
    }
  }

  async function commitRunningDescription() {
    if (open && open.description !== description) {
      await db.updateEntry(supabase, open.id, { description });
    }
  }

  async function continueEntry(e: TimeEntry) {
    await db.startTimer(supabase, userId, e.description, e.project_id, e.tags ?? [], e.task_id ?? null);
    setDescription('');
    await reload();
  }
  async function duplicate(e: TimeEntry) {
    await db.duplicateEntry(supabase, userId, e);
    await reload();
  }
  async function saveInline(id: string, fields: EntrySaveFields) {
    await db.updateEntry(supabase, id, fields);
    await reload();
  }

  // Delete with a 5s undo window (optimistic remove, deferred DB delete).
  function requestDelete(entry: TimeEntry) {
    if (pending) {
      clearTimeout(pending.timer);
      db.deleteEntry(supabase, pending.entry.id);
    }
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    const timer = setTimeout(async () => {
      await db.deleteEntry(supabase, entry.id);
      setPending(null);
    }, 5000);
    setPending({ entry, timer });
  }
  function undoDelete() {
    if (!pending) return;
    clearTimeout(pending.timer);
    setEntries((prev) => [pending.entry, ...prev]);
    setPending(null);
  }

  async function saveModal(draft: EntryDraft) {
    const startIso = new Date(draft.start).toISOString();
    const endIso = new Date(draft.end).toISOString();
    if (overlaps(new Date(draft.start).getTime(), new Date(draft.end).getTime(), draft.id)) {
      if (!window.confirm('This overlaps an existing entry. Save anyway?')) return;
    }
    if (draft.id) {
      await db.updateEntry(supabase, draft.id, {
        description: draft.description, project_id: draft.projectId || null, task_id: draft.taskId || null,
        started_at: startIso, ended_at: endIso, tags: draft.tags, billable: draft.billable,
      });
    } else {
      await db.addManualEntry(
        supabase, userId, draft.description, draft.projectId || null, startIso, endIso,
        draft.tags, draft.billable, draft.taskId || null
      );
    }
    setModalEntry(null);
    await reload();
  }

  function openManualAdd() {
    setModalEntry({
      id: null, description: '', projectId: projects[0]?.id ?? '', taskId: '',
      start: Fmt.toDatetimeLocal(Date.now() - 3600000), end: Fmt.toDatetimeLocal(Date.now()),
      tags: [], billable: false,
    });
  }

  // ---- Lookups ----
  const taskName = useMemo(() => {
    const m = new Map(tasks.map((t) => [t.id, t.name]));
    return (id: string | null) => (id ? m.get(id) ?? null : null);
  }, [tasks]);

  // Recent distinct projects (most-recently used first) for quick re-use.
  const recentProjects = useMemo(() => {
    const seen = new Set<string>();
    const out: Project[] = [];
    for (const e of entries) {
      if (e.project_id && !seen.has(e.project_id)) {
        const p = projects.find((pr) => pr.id === e.project_id);
        if (p) { seen.add(e.project_id); out.push(p); }
      }
      if (out.length >= 5) break;
    }
    return out;
  }, [entries, projects]);

  // Tasks available for the currently-selected composer project.
  const composerTasks = useMemo(
    () => tasks.filter((t) => t.project_id === projectId),
    [tasks, projectId]
  );

  // Most-recent distinct completed entries, for one-click "Continue previous".
  const previousEntries = useMemo(() => {
    const seen = new Set<string>();
    const out: TimeEntry[] = [];
    for (const e of entries) {
      if (!e.ended_at) continue;
      const key = (e.project_id ?? '') + '|' + e.description.trim().toLowerCase() + '|' + (e.task_id ?? '');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
      if (out.length >= 3) break;
    }
    return out;
  }, [entries]);

  // ---- Filtering ----
  const allTags = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => (e.tags ?? []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [entries]);

  const completed = useMemo(() => {
    const today = Fmt.dayKey(Date.now());
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yKey = Fmt.dayKey(y.getTime());
    const wkStart = new Date(); wkStart.setHours(0, 0, 0, 0);
    wkStart.setDate(wkStart.getDate() - ((wkStart.getDay() + 6) % 7));
    return entries
      .filter((e) => e.ended_at != null)
      .filter((e) => {
        const k = Fmt.dayKey(new Date(e.started_at).getTime());
        if (scope === 'today') return k === today;
        if (scope === 'yesterday') return k === yKey;
        if (scope === 'week') return new Date(e.started_at).getTime() >= wkStart.getTime();
        return true;
      })
      .filter((e) => filterClient === 'all' || clientOf(e.project_id) === filterClient)
      .filter((e) => filterProject === 'all' || e.project_id === filterProject)
      .filter((e) => filterTask === 'all' || e.task_id === filterTask)
      .filter((e) => !filterBillable || e.billable)
      .filter((e) => filterTag === 'all' || (e.tags ?? []).includes(filterTag))
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }, [entries, scope, filterClient, filterProject, filterTask, filterBillable, filterTag, clientOf]);

  // Overlap check for manual entries (against the user's own completed entries).
  const overlaps = useCallback(
    (startMs: number, endMs: number, excludeId: string | null) =>
      entries.some((e) => {
        if (e.id === excludeId || !e.ended_at) return false;
        const s = new Date(e.started_at).getTime();
        const en = new Date(e.ended_at).getTime();
        return startMs < en && s < endMs;
      }),
    [entries]
  );

  const groups = useMemo(() => groupByDay(completed), [completed]);
  const liveMs = open ? Fmt.liveEntryMs(open, now) : 0;

  return (
    <section className="view track-view density-compact">
      <div className="page-head">
        <div className="page-title">Track</div>
      </div>

      {/* ---- Composer / running timer ---- */}
      <div className={'timer-card glass' + (isRunning ? ' is-running' : '') + (isPaused ? ' is-paused' : '')}>
        <input
          ref={descRef}
          type="text"
          className="composer-desc"
          placeholder="What are you working on?"
          value={description}
          autoComplete="off"
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitRunningDescription}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); open ? stop() : start(); } }}
        />
        <div className="timer-controls">
          <ProjectPicker
            projects={projects}
            clients={clients}
            value={projectId}
            onChange={(id) => { changeProject(id); setTaskId(''); }}
          />
          {composerClient && (
            <span className="client-context" title="Client">
              <span className="entry-dot" style={{ background: composerClient.color, width: 8, height: 8 }} />
              {composerClient.name}
            </span>
          )}

          {composerTasks.length > 0 && (
            <select className="project-select" value={taskId} onChange={(e) => setTaskId(e.target.value)} aria-label="Task">
              <option value="">No task</option>
              {composerTasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}

          {isRunning && <span className="tracking-badge"><span className="pulse-dot" />Tracking</span>}
          {isPaused && <span className="tracking-badge is-paused">⏸ Paused</span>}
          <div className="timer-readout">{Fmt.duration(liveMs)}</div>

          {!open && <button className="start-btn" onClick={start} aria-label="Start timer">▶</button>}
          {isRunning && (
            <>
              <button className="pause-btn" onClick={pause} title="Pause" aria-label="Pause">⏸</button>
              <button className="stop-btn" onClick={stop} title="Stop" aria-label="Stop">■</button>
            </>
          )}
          {isPaused && (
            <>
              <button className="start-btn" onClick={resume} title="Resume" aria-label="Resume">▶</button>
              <button className="stop-btn" onClick={stop} title="Stop" aria-label="Stop">■</button>
            </>
          )}
        </div>
        {!open && (
          <input
            className="timer-note"
            type="text"
            placeholder="Tags (comma-separated) — optional"
            value={composerTags}
            autoComplete="off"
            onChange={(e) => setComposerTags(e.target.value)}
          />
        )}
      </div>

      <div className="manual-add">
        <button className="link-btn" onClick={openManualAdd}>+ Add time manually</button>
      </div>

      {/* ---- Continue previous timer ---- */}
      {!open && previousEntries.length > 0 && (
        <div className="quick-section">
          <div className="quick-head">Continue previous</div>
          <div className="quick-continue">
            {previousEntries.map((e) => {
              const p = projects.find((pr) => pr.id === e.project_id);
              return (
                <button className="continue-card glass" key={e.id} onClick={() => continueEntry(e)}>
                  <span className="continue-play">▶</span>
                  <span className="continue-main">
                    <span className="continue-desc">{e.description || 'No description'}</span>
                    <span className="continue-meta">
                      {(p ? p.name : 'No project') + (taskName(e.task_id) ? ' • ' + taskName(e.task_id) : '')}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Recent projects ---- */}
      {!open && recentProjects.length > 0 && (
        <div className="quick-section">
          <div className="quick-head">Recent projects</div>
          <div className="recent-chips">
            {recentProjects.map((p) => (
              <button key={p.id} className={'recent-chip' + (projectId === p.id ? ' is-active' : '')} onClick={() => { changeProject(p.id); setTaskId(''); }}>
                <span className="entry-dot" style={{ background: p.color, width: 8, height: 8 }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- Filters ---- */}
      <div className="filters-bar">
        {(['all', 'today', 'yesterday', 'week'] as Scope[]).map((s) => (
          <button key={s} className={'chip chip-sm' + (scope === s ? ' is-active' : '')} onClick={() => setScope(s)}>
            {s === 'all' ? 'All' : s === 'today' ? 'Today' : s === 'yesterday' ? 'Yesterday' : 'This week'}
          </button>
        ))}
        <span className="filters-spacer" />
        {clients.length > 0 && (
          <select className="filter-select" value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
            <option value="all">All clients</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <select className="filter-select" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {tasks.length > 0 && (
          <select className="filter-select" value={filterTask} onChange={(e) => setFilterTask(e.target.value)}>
            <option value="all">All tasks</option>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {allTags.length > 0 && (
          <select className="filter-select" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
            <option value="all">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <button className={'chip chip-sm' + (filterBillable ? ' is-active' : '')} onClick={() => setFilterBillable((b) => !b)}>
          Billable
        </button>
      </div>

      {/* ---- Entries ---- */}
      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : groups.length === 0 ? (
        <div className="empty-state empty-cta">
          <div className="empty-title">No time tracked yet.</div>
          <p>Start your first timer above or add a manual entry.</p>
          <button className="btn-primary" onClick={() => descRef.current?.focus()}>Start Tracking</button>
        </div>
      ) : (
        <div className="entries-list">
          {groups.map((group) => (
            <div className="day-group" key={group.key}>
              <div className="day-header">
                <span>{Fmt.dayLabel(group.entries[0].startMs)}</span>
                <span className="day-total">{Fmt.durationShort(group.total)}</span>
              </div>
              {group.entries.map((e) => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  project={projects.find((p) => p.id === e.project_id)}
                  taskName={taskName(e.task_id)}
                  projects={projects}
                  onContinue={continueEntry}
                  onDuplicate={duplicate}
                  onDelete={requestDelete}
                  onSave={saveInline}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {modalEntry && (
        <EntryModal draft={modalEntry} projects={projects} tasks={tasks} onSave={saveModal} onDelete={async (id) => { await db.deleteEntry(supabase, id); setModalEntry(null); await reload(); }} onClose={() => setModalEntry(null)} />
      )}

      {pending && (
        <div className="snackbar glass">
          <span>Entry deleted</span>
          <button className="snackbar-undo" onClick={undoDelete}>Undo</button>
        </div>
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
