'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as db from '@/lib/db';
import type { Project, Team, TimeEntry } from '@/lib/types';
import * as Fmt from '@/lib/format';
import { EntryModal, type EntryDraft } from '@/components/EntryModal';
import { EntryRow, type EntrySaveFields } from '@/components/EntryRow';

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
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const [scope, setScope] = useState<Scope>('all');
  const [filterProject, setFilterProject] = useState('all');
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

  // Suggest the project last used for a matching description (don't auto-apply).
  const lastProjectFor = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of [...entries].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())) {
      if (e.description && e.project_id) map.set(e.description.trim().toLowerCase(), e.project_id);
    }
    return map;
  }, [entries]);
  const suggestedProject =
    !open && description.trim()
      ? (() => {
          const id = lastProjectFor.get(description.trim().toLowerCase());
          return id && id !== projectId ? projects.find((p) => p.id === id) ?? null : null;
        })()
      : null;

  async function start() {
    await db.startTimer(supabase, userId, description, projectId || null);
    setDescription('');
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
    await db.startTimer(supabase, userId, e.description, e.project_id, e.tags ?? []);
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
    if (draft.id) {
      await db.updateEntry(supabase, draft.id, {
        description: draft.description, project_id: draft.projectId || null,
        started_at: startIso, ended_at: endIso, tags: draft.tags, billable: draft.billable,
      });
    } else {
      await db.addManualEntry(
        supabase, userId, draft.description, draft.projectId || null, startIso, endIso, draft.tags, draft.billable
      );
    }
    setModalEntry(null);
    await reload();
  }

  function openManualAdd() {
    setModalEntry({
      id: null, description: '', projectId: projects[0]?.id ?? '',
      start: Fmt.toDatetimeLocal(Date.now() - 3600000), end: Fmt.toDatetimeLocal(Date.now()),
      tags: [], billable: false,
    });
  }

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
      .filter((e) => filterProject === 'all' || e.project_id === filterProject)
      .filter((e) => !filterBillable || e.billable)
      .filter((e) => filterTag === 'all' || (e.tags ?? []).includes(filterTag))
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }, [entries, scope, filterProject, filterBillable, filterTag]);

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
        {suggestedProject && (
          <button className="suggest-chip" onClick={() => setProjectId(suggestedProject.id)}>
            ↳ Use <strong>{suggestedProject.name}</strong>
          </button>
        )}
        <div className="timer-controls">
          <select className="project-select" value={projectId} onChange={(e) => changeProject(e.target.value)} aria-label="Project">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option disabled>──────────</option>
            <option value={ADD_NEW}>➕ Add new…</option>
          </select>

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
      </div>

      <div className="manual-add">
        <button className="link-btn" onClick={openManualAdd}>+ Add time manually</button>
      </div>

      {/* ---- Filters ---- */}
      <div className="filters-bar">
        {(['all', 'today', 'yesterday', 'week'] as Scope[]).map((s) => (
          <button key={s} className={'chip chip-sm' + (scope === s ? ' is-active' : '')} onClick={() => setScope(s)}>
            {s === 'all' ? 'All' : s === 'today' ? 'Today' : s === 'yesterday' ? 'Yesterday' : 'This week'}
          </button>
        ))}
        <span className="filters-spacer" />
        <select className="filter-select" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
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
        <EntryModal draft={modalEntry} projects={projects} onSave={saveModal} onDelete={async (id) => { await db.deleteEntry(supabase, id); setModalEntry(null); await reload(); }} onClose={() => setModalEntry(null)} />
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
