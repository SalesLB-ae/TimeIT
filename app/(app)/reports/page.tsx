import { createClient } from '@/lib/supabase/server';
import { ReportsClient } from './ReportsClient';

export default async function ReportsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <ReportsClient userId={user!.id} />;
}
