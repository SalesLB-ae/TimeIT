import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/db';
import { TrackClient } from './TrackClient';

export default async function TrackPage() {
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
  return <TrackClient userId={user!.id} myTeam={team} />;
}
