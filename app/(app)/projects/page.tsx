import { createClient } from '@/lib/supabase/server';
import { ProjectsClient } from './ProjectsClient';

export default async function ProjectsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <ProjectsClient userId={user!.id} />;
}
