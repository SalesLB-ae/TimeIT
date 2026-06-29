import { createClient } from '@/lib/supabase/server';
import { TrackClient } from './TrackClient';

export default async function TrackPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <TrackClient userId={user!.id} />;
}
