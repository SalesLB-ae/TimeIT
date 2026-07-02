'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  fetchAllEntriesBetween,
  fetchProjects,
  fetchAllProfiles,
  updateEntry,
  deleteEntry,
  setProfileRole,
  setProfileTeam,
} from '@/lib/db';
import type { Profile, Project, Role, TimeEntryWithUser } from '@/lib/types';
import { TEAM_LIST, teamMeta } from '@/lib/teams';
import * as Fmt from '@/lib/format';
import { ymd, parseYmd, dayRange } from '@/lib/calendar';
import { EntryModal, type EntryDraft } from '@/components/EntryModal';

interface PersonGroup {
  name: string;
  team: string | null;
  total: number;
  entries: TimeEntryWithUser[];
}

export function TeamClient({ isAdmin }: { isAdmin: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useSearchParams();
  const dateStr = params.get('date') || ymd(new Date());

  const [entries, setEntries] = useState<TimeEntryWithUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<EntryDraft | null>(null);
  const [showMembers, setShowMembers] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const { startIso, endIso } = dayRange(dateStr);
    const [data, projs, profs] = await Promise.all([
      fetchAllEntriesBetween(supabase, startIso, endIso),
      fetchProjects(supabase),
      isAdmin ? fetchAllProfiles(supabase) : Promise.resolve([] as Profile[]),
    ]);
    setEntries(data);
    setProjects(projs);
    setPeople(profs);
    setLoading(false);
  }, [supabase, dateStr, isAdmin]);

  useEffect(() => {
    reload();
  }, [reload]);

  function goDay(offset: number) {
    const d = parseYmd(dateStr);
    d.setDate(d.getDate() + offset);
    router.push(`/team?date=${ymd(d)}`);
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
      if (!map.has(name)) map.set(name, { name, team: e.profiles?.team ?? null, total: 0, entries: [] });
      const g = map.get(name)!;
      g.total += ms;
      g.entries.push(e);
    }
    return { groups: Array.from(map.values()).sort((a, b) => b.total - a.total), dayTotal };
  }, [entries]);

  function openEdit(e: TimeEntryWithUser) {
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
    if (!draft.id) return;
    await updateEntry(supabase, draft.id, {
      description: draft.description,
      project_id: draft.projectId || null,
      task_id: draft.taskId || null,
      started_at: new Date(draft.start).toISOString(),
      ended_at: new Date(draft.end).toISOString(),
      tags: draft.tags,
      billable: draft.billable,
    });
    setModal(null);
    await reload();
  }

  async function remove(id: string) {
    await deleteEntry(supabase, id);
    setModal(null);
    await reload();
  }

  async function changeRole(id: string, role: Role) {
    await setProfileRole(supabase, id, role);
    await reload();
  }
  async function changeTeam(id: string, value: string) {
    await setProfileTeam(supabase, id, value === 'sales' || value === 'ops' ? value : null);
    await reload();
  }

  const heading = parseYmd(dateStr).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <section className="view">
      <div className="page-head">
        <div className="page-title">Team · {heading}</div>
        <div className="cal-day-controls">
          {isAdmin && (
            <button className="chip" onClick={() => setShowMembers((s) => !s)}>
              {showMembers ? 'Hide members' : 'Manage members'}
            </button>
          )}
          <button className="chip" onClick={() => goDay(-1)}>‹ Prev</button>
          <button className="chip" onClick={() => router.push(`/team?date=${ymd(new Date())}`)}>Today</button>
          <button className="chip" onClick={() => goDay(1)}>Next ›</button>
        </div>
      </div>

      {isAdmin && showMembers && (
        <div className="members-panel glass">
          <div className="members-title">Members</div>
          {people.length === 0 ? (
            <p className="empty-state">No members yet.</p>
          ) : (
            people.map((p) => (
              <div className="member-row" key={p.id}>
                <div className="member-id">
                  <div className="member-name">{p.full_name || p.email}</div>
                  <div className="account-sub">{p.email}</div>
                </div>
                <select className="filter-select" value={p.team ?? ''} onChange={(e) => changeTeam(p.id, e.target.value)}>
                  <option value="">No team</option>
                  {TEAM_LIST.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
                <select className="filter-select" value={p.role} onChange={(e) => changeRole(p.id, e.target.value as Role)}>
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))
          )}
        </div>
      )}

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
                  <div className="entry glass" key={e.id} onClick={() => openEdit(e)}>
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
