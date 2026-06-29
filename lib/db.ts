import type { SupabaseClient } from '@supabase/supabase-js';
import type { Project, TimeEntry, TimeEntryWithUser } from '@/lib/types';

// Accept either the browser or server client. Each function below declares its
// own typed return value, so query inputs/outputs stay checked at the call sites.
type DB = SupabaseClient<any, any, any>;

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

export async function createProject(supabase: DB, name: string, color: string, userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name: name.trim(), color, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveProject(supabase: DB, id: string) {
  const { error } = await supabase.from('projects').update({ archived: true }).eq('id', id);
  if (error) throw error;
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

export async function startTimer(
  supabase: DB,
  userId: string,
  description: string,
  projectId: string | null
): Promise<TimeEntry> {
  // Stop any entry that is still running first.
  await supabase
    .from('time_entries')
    .update({ ended_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('ended_at', null);

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id: userId,
      description: description.trim(),
      project_id: projectId,
      started_at: new Date().toISOString(),
      ended_at: null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function stopTimer(supabase: DB, id: string) {
  const { error } = await supabase
    .from('time_entries')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
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
  endedAt: string
) {
  const { error } = await supabase.from('time_entries').insert({
    user_id: userId,
    description: description.trim(),
    project_id: projectId,
    started_at: startedAt,
    ended_at: endedAt,
  });
  if (error) throw error;
}

export async function deleteEntry(supabase: DB, id: string) {
  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- Reports ---------- */

// All completed entries in the workspace since `sinceIso`, with author info.
export async function fetchTeamEntriesSince(
  supabase: DB,
  sinceIso: string
): Promise<TimeEntryWithUser[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, profiles(full_name, email, avatar_url)')
    .gte('started_at', sinceIso)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as TimeEntryWithUser[]) ?? [];
}
