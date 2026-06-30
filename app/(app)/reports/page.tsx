import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/db';
import { ReportsClient } from './ReportsClient';

export default async function ReportsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let team = null;
  try {
    team = (await getMyProfile(supabase, user!.id))?.team ?? null;
  } catch {
    /* no profile yet */
  }
  return <ReportsClient userId={user!.id} myTeam={team} />;
}
