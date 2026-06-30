'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Project } from '@/lib/types';
import { durationHM, parseDurationToMinutes } from '@/lib/format';

export interface EntryDraft {
  id: string | null;
  description: string;
  projectId: string;
  start: string; // datetime-local value
  end: string;   // datetime-local value
  tags: string[];
  billable: boolean;
}

function pad(n: number) {
  return n < 10 ? '0' + n : '' + n;
}
function splitLocal(value: string): { date: string; time: string } {
  // "YYYY-MM-DDTHH:MM" -> parts (fallback to now if malformed)
  const [d, t] = value.split('T');
  return { date: d || '', time: (t || '').slice(0, 5) };
}
function buildLocal(ms: number): string {
  const d = new Date(ms);
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  );
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
  const startParts = splitLocal(draft.start);
  const endParts = splitLocal(draft.end);

  const [description, setDescription] = useState(draft.description);
  const [projectId, setProjectId] = useState(draft.projectId);
  const [date, setDate] = useState(startParts.date);
  const [startTime, setStartTime] = useState(startParts.time);
  const [endTime, setEndTime] = useState(endParts.time);
  const [durationField, setDurationField] = useState('');
  const [tagsField, setTagsField] = useState(draft.tags.join(', '));
  const [billable, setBillable] = useState(draft.billable);

  // Canonical start/end in ms (end rolls to next day if it's <= start → overnight).
  const { startMs, endMs } = useMemo(() => {
    const s = new Date(`${date}T${startTime}`).getTime();
    let e = new Date(`${date}T${endTime}`).getTime();
    if (!isNaN(s) && !isNaN(e) && e <= s) e += 86_400_000;
    return { startMs: s, endMs: e };
  }, [date, startTime, endTime]);

  const durationMs = !isNaN(startMs) && !isNaN(endMs) ? endMs - startMs : 0;

  // Keep the duration field in sync whenever start/end change.
  useEffect(() => {
    setDurationField(durationHM(durationMs));
  }, [durationMs]);

  // Editing duration moves the END time, keeping the start fixed (Clockify behaviour).
  function commitDuration() {
    const mins = parseDurationToMinutes(durationField);
    if (mins == null || isNaN(startMs)) {
      setDurationField(durationHM(durationMs)); // revert
      return;
    }
    setEndTime(buildLocal(startMs + mins * 60_000).slice(11, 16));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function save() {
    if (!date || isNaN(startMs) || isNaN(endMs)) return alert('Please enter a valid date and times.');
    if (endMs <= startMs) return alert('The entry has no duration.');
    onSave({
      id: draft.id,
      description,
      projectId,
      start: buildLocal(startMs),
      end: buildLocal(endMs),
      tags: tagsField.split(',').map((t) => t.trim()).filter(Boolean),
      billable,
    });
  }

  const crossesMidnight = buildLocal(endMs).slice(0, 10) !== date;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal glass" role="dialog" aria-modal="true">
        <h2>{draft.id ? 'Edit entry' : 'Add time'}</h2>

        <label>
          Description
          <input
            type="text"
            value={description}
            autoComplete="off"
            placeholder="What did you work on?"
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label>
          Project
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        {/* Big, editable duration — the Clockify focal point */}
        <label className="duration-label">
          Duration
          <input
            className="duration-input"
            type="text"
            value={durationField}
            inputMode="numeric"
            placeholder="1:30"
            onChange={(e) => setDurationField(e.target.value)}
            onBlur={commitDuration}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitDuration();
              }
            }}
          />
        </label>

        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="time-row">
          <label>
            Start
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label>
            End
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>
        {crossesMidnight && <p className="modal-hint">Ends next day (overnight entry).</p>}

        <label>
          Tags <span className="label-soft">(comma-separated)</span>
          <input
            type="text"
            value={tagsField}
            autoComplete="off"
            placeholder="Sales, Client, Meeting"
            onChange={(e) => setTagsField(e.target.value)}
          />
        </label>

        <label className="checkbox-label">
          <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} />
          Billable
        </label>

        <div className="modal-actions">
          {draft.id && (
            <button className="btn-danger" onClick={() => draft.id && onDelete(draft.id)}>
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
