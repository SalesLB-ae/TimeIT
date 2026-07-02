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

  const [clientName, setClientName] = useState('');
  const [clientColor, setClientColor] = useState('#2f6df6');

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

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    const name = clientName.trim();
    if (!name) return;
    await db.createClient_(supabase, name, clientColor, userId);
    setClientName('');
    await reload();
  }

  async function addProject(clientId: string | null) {
    const name = window.prompt('New project name:')?.trim();
    if (!name) return;
    await db.createProject(supabase, name, randomColor(name), userId, myTeam, clientId);
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
      <div className={'proj-row' + (p.archived ? ' is-archived' : '')} key={p.id}>
        <div className="proj-head">
          <span className="entry-dot" style={{ background: p.color }} />
          <span className="proj-name">{p.name}</span>
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
              <span key={t.id} className={'task-pill' + (t.archived ? ' is-archived' : '')}>
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

  const noClientProjects = projectsOf(null);

  return (
    <section className="view">
      <div className="page-head">
        <div className="page-title">Clients &amp; Projects</div>
        <button className={'chip chip-sm' + (showArchived ? ' is-active' : '')} onClick={() => setShowArchived((s) => !s)}>
          {showArchived ? 'Hide archived' : 'Show archived'}
        </button>
      </div>

      <form className="project-form glass" onSubmit={addClient} style={{ padding: 14 }}>
        <input type="text" placeholder="New client name" value={clientName} autoComplete="off" onChange={(e) => setClientName(e.target.value)} required />
        <input type="color" value={clientColor} onChange={(e) => setClientColor(e.target.value)} aria-label="Client color" />
        <button type="submit" className="btn-primary">Add client</button>
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
                  <button className="mini-btn" onClick={() => addProject(c.id)}>+ Project</button>
                  <button className="mini-btn" onClick={async () => { await db.setClientArchived(supabase, c.id, !c.archived); await reload(); }}>
                    {c.archived ? 'Restore' : 'Archive'}
                  </button>
                </span>
              </div>
              {projectsOf(c.id).map(renderProject)}
              {projectsOf(c.id).length === 0 && <p className="client-empty">No projects yet.</p>}
            </div>
          ))}

          {/* Projects with no client */}
          {noClientProjects.length > 0 && (
            <div className="client-card glass">
              <div className="client-head">
                <span className="entry-dot" style={{ background: '#99a3ad', width: 14, height: 14 }} />
                <span className="client-name">No client</span>
                <span className="proj-actions">
                  <button className="mini-btn" onClick={() => addProject(null)}>+ Project</button>
                </span>
              </div>
              {noClientProjects.map(renderProject)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
