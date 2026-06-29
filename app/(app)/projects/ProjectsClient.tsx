'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as db from '@/lib/db';
import type { Project, Team } from '@/lib/types';
import { TEAM_LIST, teamMeta } from '@/lib/teams';

export function ProjectsClient({ userId, myTeam }: { userId: string; myTeam: Team | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2f6df6');
  const [team, setTeam] = useState<string>(myTeam ?? '');
  const [filter, setFilter] = useState<'all' | Team>('all');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setProjects(await db.fetchProjects(supabase));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const teamValue: Team | null = team === 'sales' || team === 'ops' ? team : null;
    await db.createProject(supabase, trimmed, color, userId, teamValue);
    setName('');
    await reload();
  }

  async function remove(p: Project) {
    if (!confirm(`Archive "${p.name}"? Existing entries keep their history.`)) return;
    await db.archiveProject(supabase, p.id);
    await reload();
  }

  const visible = projects.filter((p) => filter === 'all' || p.team === filter);

  return (
    <section className="view">
      <div className="page-head">
        <div className="page-title">Projects</div>
        <div className="range-picker">
          <button className={'chip' + (filter === 'all' ? ' is-active' : '')} onClick={() => setFilter('all')}>
            All
          </button>
          {TEAM_LIST.map((t) => (
            <button
              key={t.key}
              className={'chip' + (filter === t.key ? ' is-active' : '')}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <form className="project-form glass" onSubmit={add} style={{ padding: 14 }}>
        <input
          type="text"
          placeholder="New project name"
          value={name}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select className="filter-select" value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Team">
          <option value="">All teams</option>
          {TEAM_LIST.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Project color" />
        <button type="submit" className="btn-primary">
          Add
        </button>
      </form>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="empty-state">No projects here yet. Add one above.</p>
      ) : (
        <ul className="project-manage-list">
          {visible.map((p) => {
            const meta = teamMeta(p.team);
            return (
              <li className="project-manage-row glass" key={p.id}>
                <span className="entry-dot" style={{ background: p.color }} />
                <span className="project-manage-name">{p.name}</span>
                {meta ? (
                  <span className="team-badge" style={{ color: meta.color, background: meta.tint }}>
                    {meta.label}
                  </span>
                ) : (
                  <span className="team-badge is-none">All teams</span>
                )}
                <button className="project-delete" title="Archive project" onClick={() => remove(p)}>
                  🗑
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
