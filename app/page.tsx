import { redirect } from 'next/navigation';

// Entry point — middleware handles auth, so just forward to the tracker.
export default function Home() {
  redirect('/track');
}
