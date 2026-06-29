import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/db';
import { Sidebar } from './Sidebar';
import { Banner } from '@/components/Banner';
import type { Role, Team } from '@/lib/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Team designation + role live on the profile.
  let team: Team | null = null;
  let role: Role = 'member';
  try {
    const profile = await getMyProfile(supabase, user.id);
    team = profile?.team ?? null;
    role = profile?.role ?? 'member';
  } catch {
    // Profile may not exist yet on a brand-new account; treat as a member.
  }

  const name =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email ||
    '';
  const avatar = (user.user_metadata?.avatar_url as string) || null;

  return (
    <div className="shell">
      <Sidebar
        userId={user.id}
        name={name}
        email={user.email ?? ''}
        avatar={avatar}
        team={team}
        role={role}
      />
      <main className="content">
        <Banner />
        {children}
      </main>
    </div>
  );
}
