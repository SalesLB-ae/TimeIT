'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as db from '@/lib/db';
import type { Project } from '@/lib/types';

export function ProjectsClient({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#4f86f7');
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
    await db.createProject(supabase, trimmed, color, userId);
    setName('');
    await reload();
  }

  async function remove(p: Project) {
    if (!confirm(`Archive "${p.name}"? Existing entries keep their history.`)) return;
    await db.archiveProject(supabase, p.id);
    await reload();
  }

  return (
    <section className="view">
      <form className="project-form" onSubmit={add}>
        <input
          type="text"
          placeholder="New project name"
          value={name}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label="Project color"
        />
        <button type="submit" className="btn-primary">
          Add
        </button>
      </form>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="empty-state">No projects yet. Add one above.</p>
      ) : (
        <ul className="project-manage-list">
          {projects.map((p) => (
            <li className="project-manage-row" key={p.id}>
              <span className="entry-dot" style={{ background: p.color }} />
              <span className="project-manage-name">{p.name}</span>
              <button className="project-delete" title="Archive project" onClick={() => remove(p)}>
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
