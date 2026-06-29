// Central team config — used for labels and color-coding across the app.

export type Team = 'sales' | 'ops';

export interface TeamMeta {
  key: Team;
  label: string;
  color: string;   // solid brand color
  tint: string;    // translucent fill for badges/backgrounds
}

export const TEAMS: Record<Team, TeamMeta> = {
  sales: { key: 'sales', label: 'Sales', color: '#ff7a59', tint: 'rgba(255, 122, 89, 0.16)' },
  ops:   { key: 'ops',   label: 'Ops',   color: '#6c5ce7', tint: 'rgba(108, 92, 231, 0.16)' },
};

export const TEAM_LIST: TeamMeta[] = [TEAMS.sales, TEAMS.ops];

export function isTeam(value: unknown): value is Team {
  return value === 'sales' || value === 'ops';
}

export function teamMeta(team: string | null | undefined): TeamMeta | null {
  return isTeam(team) ? TEAMS[team] : null;
}
