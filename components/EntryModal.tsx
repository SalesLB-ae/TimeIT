'use client';

import { useEffect, useState } from 'react';
import type { Project } from '@/lib/types';

export interface EntryDraft {
  id: string | null;
  description: string;
  projectId: string;
  start: string; // datetime-local value
  end: string;   // datetime-local value
}

export function EntryModal({
  draft,
  projects,
  onSave,
  onDelete,
  onClose,
}: {
  draft: EntryDraft;
  projects: Project[];
  onSave: (d: EntryDraft) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<EntryDraft>(draft);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function save() {
    const start = new Date(d.start).getTime();
    const end = new Date(d.end).getTime();
    if (isNaN(start) || isNaN(end)) return alert('Please enter valid start and end times.');
    if (end < start) return alert('End time must be after the start time.');
    onSave(d);
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <h2>{d.id ? 'Edit entry' : 'Add time'}</h2>
        <label>
          Description
          <input
            type="text"
            value={d.description}
            autoComplete="off"
            onChange={(e) => setD({ ...d, description: e.target.value })}
          />
        </label>
        <label>
          Project
          <select value={d.projectId} onChange={(e) => setD({ ...d, projectId: e.target.value })}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="time-row">
          <label>
            Start
            <input
              type="datetime-local"
              value={d.start}
              onChange={(e) => setD({ ...d, start: e.target.value })}
            />
          </label>
          <label>
            End
            <input
              type="datetime-local"
              value={d.end}
              onChange={(e) => setD({ ...d, end: e.target.value })}
            />
          </label>
        </div>
        <div className="modal-actions">
          {d.id && (
            <button className="btn-danger" onClick={() => d.id && onDelete(d.id)}>
              Delete
            </button>
          )}
          <span className="spacer" />
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
