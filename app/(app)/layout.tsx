import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/db';
import { Sidebar } from './Sidebar';
import type { Team } from '@/lib/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // The team designation lives on the profile (set by the user).
  let team: Team | null = null;
  try {
    const profile = await getMyProfile(supabase, user.id);
    team = profile?.team ?? null;
  } catch {
    // Profile may not exist yet on a brand-new account; treat as no team.
  }

  const name =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email ||
    '';
  const avatar = (user.user_metadata?.avatar_url as string) || null;

  return (
    <div className="shell">
      <Sidebar userId={user.id} name={name} email={user.email ?? ''} avatar={avatar} team={team} />
      <main className="content">{children}</main>
    </div>
  );
}
