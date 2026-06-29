import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { CalendarClient } from './CalendarClient';

export default async function CalendarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <Suspense fallback={null}>
      <CalendarClient userId={user!.id} />
    </Suspense>
  );
}
