'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const TABS = [
  { href: '/track', label: 'Track' },
  { href: '/reports', label: 'Reports' },
  { href: '/projects', label: 'Projects' },
];

export function AppNav({ name, avatar }: { name: string; avatar: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="app-bar">
      <div className="brand">
        <span className="brand-mark">⏱</span>
        <span className="brand-name">TimeIT</span>
      </div>
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={'tab' + (pathname === t.href ? ' is-active' : '')}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="user-menu">
        <button
          className="user-btn"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Account menu"
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="user-avatar" referrerPolicy="no-referrer" />
          ) : (
            <span className="user-avatar user-initial">{name.charAt(0).toUpperCase()}</span>
          )}
        </button>
        {menuOpen && (
          <>
            <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="user-dropdown">
              <div className="user-name">{name}</div>
              <button className="dropdown-item" onClick={signOut}>
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
