import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/db';
import { TeamClient } from './TeamClient';

export default async function TeamPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getMyProfile(supabase, user!.id);
  const role = profile?.role ?? 'member';
  // Members can't reach the team view.
  if (role !== 'manager' && role !== 'admin') redirect('/track');

  return (
    <Suspense fallback={null}>
      <TeamClient isAdmin={role === 'admin'} />
    </Suspense>
  );
}
