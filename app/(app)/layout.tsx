import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppNav } from './AppNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const name =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email ||
    '';
  const avatar = (user.user_metadata?.avatar_url as string) || null;

  return (
    <>
      <AppNav name={name} avatar={avatar} />
      <main className="content">{children}</main>
    </>
  );
}
