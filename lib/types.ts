// Domain types + a minimal Supabase Database type for typed queries.

export type Team = 'sales' | 'ops';
export type Role = 'member' | 'manager' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  team: Team | null;
  role: Role;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  team: Team | null;
  client_id: string | null;
  archived: boolean;
  done: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  name: string;
  archived: boolean;
  done: boolean;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string | null;
  description: string;
  task_id: string | null;
  started_at: string;      // ISO timestamp
  ended_at: string | null; // null while active (running OR paused)
  running_since: string | null; // start of current active segment; null = paused
  accumulated_seconds: number;   // active time banked from previous segments
  tags: string[];
  billable: boolean;
  created_at: string;
}

// Entry joined with its author profile (for team reports).
export interface TimeEntryWithUser extends TimeEntry {
  profiles: Pick<Profile, 'full_name' | 'email' | 'avatar_url' | 'team'> | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
      };
      projects: {
        Row: Project;
        Insert: Partial<Project> & { name: string };
        Update: Partial<Project>;
      };
      time_entries: {
        Row: TimeEntry;
        Insert: Partial<TimeEntry> & { user_id: string; started_at: string };
        Update: Partial<TimeEntry>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
