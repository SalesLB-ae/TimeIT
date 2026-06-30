'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { bulkAddEntries, createProject, fetchProjects } from '@/lib/db';
import type { Project, Team } from '@/lib/types';
import { parseCsv, mapEntries, type ParsedEntry } from '@/lib/csv';
import * as Fmt from '@/lib/format';

export function ImportModal({
  userId,
  myTeam,
  projects,
  onClose,
  onImported,
}: {
  userId: string;
  myTeam: Team | null;
  projects: Project[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [entries, setEntries] = useState<ParsedEntry[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { entries } = mapEntries(parseCsv(String(reader.result)));
        if (!entries.length) setError('No rows found. Is this a CSV with a header row?');
        setEntries(entries);
      } catch {
        setError('Could not read that file.');
      }
    };
    reader.readAsText(file);
  }

  const valid = entries?.filter((e) => e.valid) ?? [];
  const invalid = entries?.filter((e) => !e.valid) ?? [];

  async function doImport() {
    if (!valid.length) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      // Resolve project names → ids, creating any that don't exist yet.
      const byName = new Map<string, string>();
      for (const p of projects) byName.set(p.name.trim().toLowerCase(), p.id);

      const rows = [];
      for (const e of valid) {
        let projectId: string | null = null;
        const key = e.project.trim().toLowerCase();
        if (key) {
          if (!byName.has(key)) {
            const created = await createProject(supabase, e.project.trim(), '#2f6df6', userId, myTeam);
            byName.set(key, created.id);
          }
          projectId = byName.get(key)!;
        }
        rows.push({
          projectId,
          description: e.description,
          startIso: new Date(e.startMs).toISOString(),
          endIso: new Date(e.endMs).toISOString(),
        });
      }
      await bulkAddEntries(supabase, userId, rows);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal glass import-modal" role="dialog" aria-modal="true">
        <h2>Import time from CSV</h2>

        {!entries ? (
          <>
            <p className="import-help">
              Upload a CSV exported from TimeIT or Clockify. We detect columns automatically —
              <strong> Project, Description</strong>, and either <strong>Start/End</strong> datetimes
              or <strong>Start&nbsp;Date/Time + End&nbsp;Date/Time</strong> (a Duration column is used
              if there&apos;s no end).
            </p>
            <label className="file-drop">
              <input type="file" accept=".csv,text/csv" onChange={onFile} />
              <span>Choose a .csv file…</span>
            </label>
            {error && <p className="modal-hint" style={{ color: 'var(--danger)' }}>{error}</p>}
          </>
        ) : (
          <>
            <div className="import-summary">
              <span><strong>{fileName}</strong></span>
              <span className="import-counts">
                {valid.length} ready{invalid.length ? ` · ${invalid.length} skipped` : ''}
              </span>
            </div>

            <div className="import-preview">
              {entries.slice(0, 60).map((e, i) => (
                <div className={'import-row' + (e.valid ? '' : ' is-bad')} key={i}>
                  <span className="import-when">
                    {e.valid
                      ? `${Fmt.dayLabel(e.startMs)} · ${Fmt.clockTime(e.startMs)}–${Fmt.clockTime(e.endMs)}`
                      : (e.error ?? 'Invalid')}
                  </span>
                  <span className="import-proj">{e.project || '—'}</span>
                  <span className="import-desc">{e.description || 'No description'}</span>
                  <span className="import-dur">
                    {e.valid ? Fmt.durationShort(e.endMs - e.startMs) : ''}
                  </span>
                </div>
              ))}
              {entries.length > 60 && (
                <div className="import-row"><span className="import-when">+ {entries.length - 60} more…</span></div>
              )}
            </div>

            {error && <p className="modal-hint" style={{ color: 'var(--danger)' }}>{error}</p>}
          </>
        )}

        <div className="modal-actions">
          {entries && (
            <button className="btn-ghost" onClick={() => { setEntries(null); setFileName(''); }}>
              ← Choose another
            </button>
          )}
          <span className="spacer" />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          {entries && (
            <button className="btn-primary" onClick={doImport} disabled={busy || !valid.length}>
              {busy ? 'Importing…' : `Import ${valid.length}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
