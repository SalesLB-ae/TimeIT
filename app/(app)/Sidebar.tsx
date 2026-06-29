'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { setMyTeam } from '@/lib/db';
import { TEAM_LIST, teamMeta } from '@/lib/teams';
import type { Team } from '@/lib/types';
import { MiniCalendar } from '@/components/MiniCalendar';

const NAV = [
  { href: '/track', label: 'Track', icon: '⏱' },
  { href: '/calendar', label: 'Calendar', icon: '🗓' },
  { href: '/reports', label: 'Reports', icon: '📊' },
  { href: '/projects', label: 'Projects', icon: '🗂' },
];

export function Sidebar({
  userId,
  name,
  email,
  avatar,
  team,
}: {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  team: Team | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const [savingTeam, setSavingTeam] = useState(false);
  const meta = teamMeta(team);

  async function changeTeam(value: string) {
    if (value !== 'sales' && value !== 'ops') return;
    setSavingTeam(true);
    const supabase = createClient();
    try {
      await setMyTeam(supabase, userId, value);
      router.refresh();
    } finally {
      setSavingTeam(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className={'sidebar glass' + (collapsed ? ' is-collapsed' : '')}>
      <div className="brand">
        <span className="brand-mark">⏱</span>
        <span className="brand-name">TimeIT</span>
        <button
          className="menu-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      <nav className="side-nav">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} className={'nav-link' + (active ? ' is-active' : '')}>
              <span className="nav-ico">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-calendar">
        <MiniCalendar userId={userId} />
      </div>

      <div className="side-spacer" />

      <div className="account-block">
        <div className="account">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="account-avatar" referrerPolicy="no-referrer" />
          ) : (
            <span className="account-avatar account-initial">{name.charAt(0).toUpperCase()}</span>
          )}
          <div className="account-main">
            <div className="account-name">{name}</div>
            <div className="account-sub">{email}</div>
          </div>
          <button className="signout-btn" onClick={signOut}>
            Sign out
          </button>
        </div>
        <div className="team-row">
          {meta ? (
            <span className="team-badge" style={{ color: meta.color, background: meta.tint }}>
              {meta.label}
            </span>
          ) : (
            <span className="team-badge is-none">No team</span>
          )}
          <select
            className="team-select"
            value={team ?? ''}
            onChange={(e) => changeTeam(e.target.value)}
            disabled={savingTeam}
            aria-label="Your team"
          >
            <option value="" disabled>
              Set your team…
            </option>
            {TEAM_LIST.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
}
