'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as db from '@/lib/db';
import type { Client, Project, Task, Team } from '@/lib/types';
import { TEAM_LIST, teamMeta } from '@/lib/teams';

function randomColor(seed: string): string {
  const palette = ['#2f6df6', '#2bb673', '#e5a23c', '#e5484d', '#6c5ce7', '#34b3c4', '#e36fb0'];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function ProjectsClient({ userId, myTeam }: { userId: string; myTeam: Team | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add-project form (projects are first-class; a client is optional).
  const [pName, setPName] = useState('');
  const [pColor, setPColor] = useState('#2f6df6');
  const [pClient, setPClient] = useState('');
  const [pTeam, setPTeam] = useState<string>(myTeam ?? '');

  // Add-client form.
  const [cName, setCName] = useState('');
  const [cColor, setCColor] = useState('#6c5ce7');

  const reload = useCallback(async () => {
    const [c, p, t] = await Promise.all([
      db.fetchClients(supabase, true),
      db.fetchAllProjects(supabase),
      db.fetchTasks(supabase, true),
    ]);
    setClients(c);
    setProjects(p);
    setTasks(t);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { reload(); }, [reload]);

  // Default the "add project" client to Internal once clients load.
  useEffect(() => {
    if (!pClient && clients.length) {
      const internal = clients.find((c) => c.is_internal);
      if (internal) setPClient(internal.id);
    }
  }, [clients, pClient]);

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    const name = pName.trim();
    if (!name) return;
    const team = pTeam === 'sales' || pTeam === 'ops' ? pTeam : null;
    await db.createProject(supabase, name, pColor, userId, team, pClient || null);
    setPName('');
    await reload();
  }

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    const name = cName.trim();
    if (!name) return;
    await db.createClient_(supabase, name, cColor, userId);
    setCName('');
    await reload();
  }

  async function addTask(projectId: string) {
    const name = window.prompt('New task name:')?.trim();
    if (!name) return;
    await db.createTask(supabase, projectId, name);
    await reload();
  }

  const visibleClients = clients.filter((c) => showArchived || !c.archived);
  const tasksByProject = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!showArchived && t.archived) continue;
      if (!m.has(t.project_id)) m.set(t.project_id, []);
      m.get(t.project_id)!.push(t);
    }
    return m;
  }, [tasks, showArchived]);

  function projectsOf(clientId: string | null) {
    return projects.filter((p) => (p.client_id ?? null) === clientId && (showArchived || !p.archived));
  }

  function renderProject(p: Project) {
    const meta = teamMeta(p.team);
    const ptasks = tasksByProject.get(p.id) ?? [];
    return (
      <div className={'proj-row' + (p.archived ? ' is-archived' : '') + (p.done ? ' is-done' : '')} key={p.id}>
        <div className="proj-head">
          <span className="entry-dot" style={{ background: p.color }} />
          <span className={'proj-name' + (p.done ? ' is-done' : '')}>{p.name}</span>
          <button
            className={'status-chip' + (p.done ? ' is-done' : '')}
            title={p.done ? 'Mark ongoing' : 'Mark done'}
            onClick={async () => { await db.setProjectDone(supabase, p.id, !p.done); await reload(); }}
          >
            {p.done ? '✓ Done' : '● Ongoing'}
          </button>
          {meta && <span className="team-badge" style={{ color: meta.color, background: meta.tint }}>{meta.label}</span>}
          <span className="proj-actions">
            <button className="mini-btn" onClick={() => addTask(p.id)}>+ Task</button>
            <button className="mini-btn" onClick={async () => { await db.setProjectArchived(supabase, p.id, !p.archived); await reload(); }}>
              {p.archived ? 'Restore' : 'Archive'}
            </button>
          </span>
        </div>
        {ptasks.length > 0 && (
          <div className="task-list">
            {ptasks.map((t) => (
              <span key={t.id} className={'task-pill' + (t.done ? ' is-done' : '') + (t.archived ? ' is-archived' : '')}>
                <button className="task-check" title={t.done ? 'Mark ongoing' : 'Mark done'}
                  onClick={async () => { await db.setTaskDone(supabase, t.id, !t.done); await reload(); }}>
                  {t.done ? '✓' : '○'}
                </button>
                {t.name}
                <button className="task-x" title={t.archived ? 'Restore' : 'Archive'}
                  onClick={async () => { await db.setTaskArchived(supabase, t.id, !t.archived); await reload(); }}>
                  {t.archived ? '↺' : '×'}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="view">
      <div className="page-head">
        <div className="page-title">Projects</div>
        <button className={'chip chip-sm' + (showArchived ? ' is-active' : '')} onClick={() => setShowArchived((s) => !s)}>
          {showArchived ? 'Hide archived' : 'Show archived'}
        </button>
      </div>

      {/* Projects are first-class — a client is optional. */}
      <form className="project-form glass" onSubmit={addProject} style={{ padding: 14 }}>
        <input type="text" placeholder="New project name" value={pName} autoComplete="off" onChange={(e) => setPName(e.target.value)} required />
        <select className="filter-select" value={pClient} onChange={(e) => setPClient(e.target.value)} aria-label="Client">
          {clients.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="filter-select" value={pTeam} onChange={(e) => setPTeam(e.target.value)} aria-label="Team">
          <option value="">All teams</option>
          {TEAM_LIST.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <input type="color" value={pColor} onChange={(e) => setPColor(e.target.value)} aria-label="Project color" />
        <button type="submit" className="btn-primary">Add project</button>
      </form>

      <form className="project-form glass client-form" onSubmit={addClient} style={{ padding: 12 }}>
        <span className="form-label">Client (optional grouping)</span>
        <input type="text" placeholder="New client name" value={cName} autoComplete="off" onChange={(e) => setCName(e.target.value)} />
        <input type="color" value={cColor} onChange={(e) => setCColor(e.target.value)} aria-label="Client color" />
        <button type="submit" className="btn-ghost">Add client</button>
      </form>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : (
        <div className="client-list">
          {visibleClients.map((c) => (
            <div className={'client-card glass' + (c.archived ? ' is-archived' : '')} key={c.id}>
              <div className="client-head">
                <span className="entry-dot" style={{ background: c.color, width: 14, height: 14 }} />
                <span className="client-name">{c.name}</span>
                <span className="proj-actions">
                  <button className="mini-btn" onClick={async () => { await db.setClientArchived(supabase, c.id, !c.archived); await reload(); }}>
                    {c.archived ? 'Restore' : 'Archive'}
                  </button>
                </span>
              </div>
              {projectsOf(c.id).map(renderProject)}
              {projectsOf(c.id).length === 0 && <p className="client-empty">No projects yet.</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
