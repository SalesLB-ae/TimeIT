import type { SupabaseClient } from '@supabase/supabase-js';
import type { Client, Profile, Project, Role, Task, Team, TimeEntry, TimeEntryWithUser } from '@/lib/types';

// Accept either the browser or server client. Each function below declares its
// own typed return value, so query inputs/outputs stay checked at the call sites.
type DB = SupabaseClient<any, any, any>;

/* ---------- Profile / team ---------- */

export async function getMyProfile(supabase: DB, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setMyTeam(supabase: DB, userId: string, team: Team) {
  const { error } = await supabase.from('profiles').update({ team }).eq('id', userId);
  if (error) throw error;
}

/* ---- Admin: manage everyone (allowed by RLS only for admins) ---- */

export async function fetchAllProfiles(supabase: DB): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function setProfileRole(supabase: DB, id: string, role: Role) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
  if (error) throw error;
}

export async function setProfileTeam(supabase: DB, id: string, team: Team | null) {
  const { error } = await supabase.from('profiles').update({ team }).eq('id', id);
  if (error) throw error;
}

/* ---------- Projects (shared across the workspace) ---------- */

export async function fetchProjects(supabase: DB): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Include archived projects too (for the management view).
export async function fetchAllProjects(supabase: DB): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Every project belongs to a client; if none is given it falls to Internal.
export async function internalClientId(supabase: DB): Promise<string | null> {
  const { data } = await supabase.from('clients').select('id').eq('is_internal', true).limit(1);
  return data?.[0]?.id ?? null;
}

export async function createProject(
  supabase: DB,
  name: string,
  color: string,
  userId: string,
  team: Team | null,
  clientId: string | null = null
) {
  const resolvedClient = clientId ?? (await internalClientId(supabase));
  const { data, error } = await supabase
    .from('projects')
    .insert({ name: name.trim(), color, created_by: userId, team, client_id: resolvedClient })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveProject(supabase: DB, id: string) {
  const { error } = await supabase.from('projects').update({ archived: true }).eq('id', id);
  if (error) throw error;
}

export async function setProjectArchived(supabase: DB, id: string, archived: boolean) {
  const { error } = await supabase.from('projects').update({ archived }).eq('id', id);
  if (error) throw error;
}

export async function setProjectDone(supabase: DB, id: string, done: boolean) {
  const { error } = await supabase.from('projects').update({ done }).eq('id', id);
  if (error) throw error;
}

// Permanently delete a project. Its tasks are removed (ON DELETE CASCADE) and
// any time entries that referenced it are kept but unlinked (ON DELETE SET NULL).
export async function deleteProject(supabase: DB, id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- Clients ---------- */

export async function fetchClients(supabase: DB, includeArchived = false): Promise<Client[]> {
  let q = supabase.from('clients').select('*').order('name', { ascending: true });
  if (!includeArchived) q = q.eq('archived', false);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createClient_(supabase: DB, name: string, color: string, userId: string) {
  const { data, error } = await supabase
    .from('clients')
    .insert({ name: name.trim(), color, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setClientArchived(supabase: DB, id: string, archived: boolean) {
  const { error } = await supabase.from('clients').update({ archived }).eq('id', id);
  if (error) throw error;
}

// Permanently delete a client. Its projects are reassigned to the internal
// (Operations) client so they aren't orphaned — every project must keep a
// client. The internal client itself cannot be deleted.
export async function deleteClient(supabase: DB, id: string) {
  const internal = await internalClientId(supabase);
  if (internal === id) throw new Error('The Operations client cannot be deleted.');
  if (internal) {
    const { error: reassignErr } = await supabase
      .from('projects')
      .update({ client_id: internal })
      .eq('client_id', id);
    if (reassignErr) throw reassignErr;
  }
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- Tasks ---------- */

export async function fetchTasks(supabase: DB, includeArchived = false): Promise<Task[]> {
  let q = supabase.from('tasks').select('*').order('name', { ascending: true });
  if (!includeArchived) q = q.eq('archived', false);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createTask(supabase: DB, projectId: string, name: string) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ project_id: projectId, name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setTaskArchived(supabase: DB, id: string, archived: boolean) {
  const { error } = await supabase.from('tasks').update({ archived }).eq('id', id);
  if (error) throw error;
}

export async function setTaskDone(supabase: DB, id: string, done: boolean) {
  const { error } = await supabase.from('tasks').update({ done }).eq('id', id);
  if (error) throw error;
}

// Permanently delete a task. Time entries that referenced it are kept but
// unlinked (ON DELETE SET NULL).
export async function deleteTask(supabase: DB, id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// Find-or-create a client by name (used by CSV import).
export async function ensureClient(supabase: DB, name: string, color: string, userId: string): Promise<Client> {
  const trimmed = name.trim();
  const { data: existing } = await supabase.from('clients').select('*').ilike('name', trimmed).limit(1);
  if (existing && existing.length) return existing[0] as Client;
  return createClient_(supabase, trimmed, color, userId);
}

/* ---------- Time entries ---------- */

// The current user's own entries (for the Track view).
export async function fetchMyEntries(supabase: DB, userId: string): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Active (running + paused) seconds banked by an open entry, as of now.
function liveSeconds(e: TimeEntry): number {
  const acc = e.accumulated_seconds ?? 0;
  if (e.running_since) return acc + Math.floor((Date.now() - new Date(e.running_since).getTime()) / 1000);
  return acc;
}

// Close an open entry: compress out paused gaps so ended_at - started_at == total.
async function finalize(supabase: DB, e: TimeEntry) {
  const total = liveSeconds(e);
  const endedIso = new Date(new Date(e.started_at).getTime() + total * 1000).toISOString();
  const { error } = await supabase
    .from('time_entries')
    .update({ ended_at: endedIso, accumulated_seconds: total, running_since: null })
    .eq('id', e.id);
  if (error) throw error;
}

async function finalizeOpen(supabase: DB, userId: string) {
  const { data } = await supabase.from('time_entries').select('*').eq('user_id', userId).is('ended_at', null);
  for (const e of (data ?? []) as TimeEntry[]) await finalize(supabase, e);
}

export async function startTimer(
  supabase: DB,
  userId: string,
  description: string,
  projectId: string | null,
  tags: string[] = [],
  taskId: string | null = null
): Promise<TimeEntry> {
  await finalizeOpen(supabase, userId); // close any running/paused entry first
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id: userId,
      description: description.trim(),
      project_id: projectId,
      started_at: nowIso,
      ended_at: null,
      running_since: nowIso,
      accumulated_seconds: 0,
      tags,
      task_id: taskId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Pause: bank the current segment, clear running_since (entry stays open).
export async function pauseTimer(supabase: DB, e: TimeEntry) {
  const { error } = await supabase
    .from('time_entries')
    .update({ running_since: null, accumulated_seconds: liveSeconds(e) })
    .eq('id', e.id);
  if (error) throw error;
}

// Resume: open a new segment.
export async function resumeTimer(supabase: DB, id: string) {
  const { error } = await supabase
    .from('time_entries')
    .update({ running_since: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// Stop: finalize the open entry into a normal completed entry.
export async function stopTimer(supabase: DB, e: TimeEntry) {
  await finalize(supabase, e);
}

export async function updateEntry(supabase: DB, id: string, fields: Partial<TimeEntry>) {
  const { error } = await supabase.from('time_entries').update(fields).eq('id', id);
  if (error) throw error;
}

export async function addManualEntry(
  supabase: DB,
  userId: string,
  description: string,
  projectId: string | null,
  startedAt: string,
  endedAt: string,
  tags: string[] = [],
  billable = false,
  taskId: string | null = null
) {
  const { error } = await supabase.from('time_entries').insert({
    user_id: userId,
    description: description.trim(),
    project_id: projectId,
    started_at: startedAt,
    ended_at: endedAt,
    tags,
    billable,
    task_id: taskId,
  });
  if (error) throw error;
}

// Copy an existing entry verbatim (used by the "Duplicate" action).
export async function duplicateEntry(supabase: DB, userId: string, e: TimeEntry) {
  const { error } = await supabase.from('time_entries').insert({
    user_id: userId,
    description: e.description,
    project_id: e.project_id,
    task_id: e.task_id ?? null,
    started_at: e.started_at,
    ended_at: e.ended_at,
    tags: e.tags ?? [],
    billable: e.billable ?? false,
  });
  if (error) throw error;
}

export async function deleteEntry(supabase: DB, id: string) {
  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) throw error;
}

// Insert many entries at once (used by the CSV importer).
export async function bulkAddEntries(
  supabase: DB,
  userId: string,
  rows: { projectId: string | null; description: string; startIso: string; endIso: string }[]
) {
  if (!rows.length) return;
  const payload = rows.map((r) => ({
    user_id: userId,
    project_id: r.projectId,
    description: r.description,
    started_at: r.startIso,
    ended_at: r.endIso,
  }));
  const { error } = await supabase.from('time_entries').insert(payload);
  if (error) throw error;
}

/* ---------- Reports ---------- */

// The current user's completed entries since `sinceIso` — for personal reports.
export async function fetchMyEntriesSince(
  supabase: DB,
  userId: string,
  sinceIso: string
): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', sinceIso)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ALL teammates' completed entries within [startIso, endIso), with author
// info — for the manager/admin Team view. RLS only returns rows to elevated
// roles, so members calling this still only ever see their own.
export async function fetchAllEntriesBetween(
  supabase: DB,
  startIso: string,
  endIso: string
): Promise<TimeEntryWithUser[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, profiles(full_name, email, avatar_url, team)')
    .gte('started_at', startIso)
    .lt('started_at', endIso)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: true });
  if (error) throw error;
  return (data as unknown as TimeEntryWithUser[]) ?? [];
}

// The current user's completed entries that started within [startIso, endIso)
// — for the calendar's day view and per-day activity markers. Entries are
// private, so this only ever returns the signed-in user's own time.
export async function fetchMyEntriesBetween(
  supabase: DB,
  userId: string,
  startIso: string,
  endIso: string
): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', startIso)
    .lt('started_at', endIso)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
