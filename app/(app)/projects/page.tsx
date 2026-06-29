import { createClient } from '@/lib/supabase/server';
import { getMyProfile } from '@/lib/db';
import { ProjectsClient } from './ProjectsClient';

export default async function ProjectsPage() {
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
  return <ProjectsClient userId={user!.id} myTeam={team} />;
}
