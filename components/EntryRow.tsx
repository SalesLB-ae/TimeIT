'use client';

import { useEffect, useRef, useState } from 'react';
import type { Project, TimeEntry } from '@/lib/types';
import * as Fmt from '@/lib/format';
import { tagColor, tagTint } from '@/lib/tags';

export interface EntrySaveFields {
  description: string;
  project_id: string | null;
  started_at: string;
  ended_at: string;
  tags: string[];
}

function pad(n: number) {
  return n < 10 ? '0' + n : '' + n;
}
function timeOf(ms: number) {
  const d = new Date(ms);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

export function EntryRow({
  entry,
  project,
  taskName,
  projects,
  onContinue,
  onDuplicate,
  onDelete,
  onSave,
}: {
  entry: TimeEntry;
  project: Project | undefined;
  taskName?: string | null;
  projects: Project[];
  onContinue: (e: TimeEntry) => void;
  onDuplicate: (e: TimeEntry) => void;
  onDelete: (e: TimeEntry) => void;
  onSave: (id: string, fields: EntrySaveFields) => void;
}) {
  const startMs = new Date(entry.started_at).getTime();
  const endMs = entry.ended_at ? new Date(entry.ended_at).getTime() : Date.now();

  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(entry.description);
  const [projectId, setProjectId] = useState(entry.project_id ?? '');
  const [startTime, setStartTime] = useState(timeOf(startMs));
  const [endTime, setEndTime] = useState(timeOf(endMs));
  const [durationField, setDurationField] = useState(Fmt.durationHM(endMs - startMs));
  const [tagsField, setTagsField] = useState((entry.tags ?? []).join(', '));
  const rowRef = useRef<HTMLDivElement>(null);

  const dateStr = Fmt.dayKey(startMs); // YYYY-MM-DD (local)

  function computeRange() {
    const s = new Date(`${dateStr}T${startTime}`).getTime();
    let e = new Date(`${dateStr}T${endTime}`).getTime();
    if (!isNaN(s) && !isNaN(e) && e <= s) e += 86_400_000;
    return { s, e };
  }

  function commitDuration() {
    const mins = Fmt.parseDurationToMinutes(durationField);
    const { s } = computeRange();
    if (mins == null || isNaN(s)) {
      const { s: s2, e: e2 } = computeRange();
      setDurationField(Fmt.durationHM(e2 - s2));
      return;
    }
    setEndTime(timeOf(s + mins * 60_000));
  }

  function startEdit() {
    setDesc(entry.description);
    setProjectId(entry.project_id ?? '');
    setStartTime(timeOf(startMs));
    setEndTime(timeOf(endMs));
    setDurationField(Fmt.durationHM(endMs - startMs));
    setTagsField((entry.tags ?? []).join(', '));
    setEditing(true);
  }

  function save() {
    const { s, e } = computeRange();
    if (isNaN(s) || isNaN(e) || e <= s) {
      setEditing(false);
      return;
    }
    onSave(entry.id, {
      description: desc,
      project_id: projectId || null,
      started_at: new Date(s).toISOString(),
      ended_at: new Date(e).toISOString(),
      tags: tagsField.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setEditing(false);
  }

  // Click outside the editing row → save automatically.
  useEffect(() => {
    if (!editing) return;
    function onDown(ev: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(ev.target as Node)) save();
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setEditing(false);
      if (ev.key === 'Enter') save();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, desc, projectId, startTime, endTime, tagsField]);

  if (editing) {
    return (
      <div className="entry entry--editing glass" ref={rowRef}>
        <span className="entry-dot" style={{ background: project?.color ?? '#99a3ad' }} />
        <div className="entry-edit">
          <input
            className="inline-input inline-desc"
            value={desc}
            autoFocus
            placeholder="Description"
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="inline-row">
            <select className="inline-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input className="inline-input inline-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <span className="inline-dash">–</span>
            <input className="inline-input inline-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            <input
              className="inline-input inline-dur"
              value={durationField}
              onChange={(e) => setDurationField(e.target.value)}
              onBlur={commitDuration}
            />
          </div>
          <input
            className="inline-input inline-tags"
            value={tagsField}
            placeholder="Tags (comma-separated)"
            onChange={(e) => setTagsField(e.target.value)}
          />
        </div>
        <button className="btn-primary inline-save" onMouseDown={(e) => { e.preventDefault(); save(); }}>
          Save
        </button>
      </div>
    );
  }

  return (
    <div className="entry glass" onClick={startEdit}>
      <span className="entry-dot" style={{ background: project?.color ?? '#99a3ad' }} />
      <div className="entry-main">
        <div className={'entry-desc' + (entry.description ? '' : ' is-empty')}>
          {entry.description || 'No description'}
          {entry.billable && <span className="billable-dot" title="Billable">$</span>}
        </div>
        <div className="entry-meta">
          {(project ? project.name + ' • ' : '') +
            (taskName ? taskName + ' • ' : '') +
            Fmt.clockTime(startMs) + ' – ' + Fmt.clockTime(endMs)}
        </div>
        {entry.tags && entry.tags.length > 0 && (
          <div className="entry-tags">
            {entry.tags.map((t) => (
              <span key={t} className="tag-pill" style={{ color: tagColor(t), background: tagTint(t) }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="entry-duration">{Fmt.duration(endMs - startMs)}</span>
      <div className="entry-actions" onClick={(e) => e.stopPropagation()}>
        <button className="entry-action" title="Continue" onClick={() => onContinue(entry)}>▶</button>
        <button className="entry-action" title="Edit" onClick={startEdit}>✎</button>
        <button className="entry-action" title="Duplicate" onClick={() => onDuplicate(entry)}>⧉</button>
        <button className="entry-action entry-action--danger" title="Delete" onClick={() => onDelete(entry)}>🗑</button>
      </div>
    </div>
  );
}
