'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Client, Project } from '@/lib/types';

// Project-first picker: you always pick a PROJECT. Its client is shown only as
// context (a group header + the button label) — clients are never selectable
// here, so the Track page only ever lists projects.
export function ProjectPicker({
  projects,
  clients,
  value,
  onChange,
}: {
  projects: Project[];
  clients: Client[];
  value: string;
  onChange: (projectId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const selected = projects.find((p) => p.id === value) ?? null;
  const selectedClient = selected ? clientById.get(selected.client_id ?? '') : null;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Group filtered projects by client, ordered with each client's projects.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byClient = new Map<string, { client: Client | null; items: Project[] }>();
    for (const p of projects) {
      const client = clientById.get(p.client_id ?? '') ?? null;
      const hay = (p.name + ' ' + (client?.name ?? '')).toLowerCase();
      if (q && !hay.includes(q)) continue;
      const key = p.client_id ?? 'none';
      if (!byClient.has(key)) byClient.set(key, { client, items: [] });
      byClient.get(key)!.items.push(p);
    }
    // Internal client last; otherwise alphabetical by client name.
    return Array.from(byClient.values()).sort((a, b) => {
      if (a.client?.is_internal) return 1;
      if (b.client?.is_internal) return -1;
      return (a.client?.name ?? '').localeCompare(b.client?.name ?? '');
    });
  }, [projects, clientById, query]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="project-picker" ref={ref}>
      <button type="button" className="picker-btn" onClick={() => setOpen((o) => !o)}>
        {selected ? (
          <>
            {selectedClient && <span className="picker-client">{selectedClient.name} ›</span>}
            <span className="picker-dot" style={{ background: selected.color }} />
            <span className="picker-proj">{selected.name}</span>
          </>
        ) : (
          <span className="picker-placeholder">Select a project…</span>
        )}
        <span className="picker-caret">▾</span>
      </button>

      {open && (
        <div className="picker-panel">
          <input
            className="picker-search"
            placeholder="Search projects or clients…"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="picker-list">
            {groups.length === 0 && <div className="picker-empty">No projects found.</div>}
            {groups.map((g) => (
              <div className="picker-group" key={g.client?.id ?? 'none'}>
                <div className="picker-group-head">{g.client?.name ?? 'No client'}</div>
                {g.items.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={'picker-item' + (p.id === value ? ' is-active' : '') + (p.done ? ' is-done' : '')}
                    onClick={() => pick(p.id)}
                  >
                    <span className="picker-dot" style={{ background: p.color }} />
                    <span className="picker-item-name">{p.name}</span>
                    {p.done && <span className="picker-done">✓ Done</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
