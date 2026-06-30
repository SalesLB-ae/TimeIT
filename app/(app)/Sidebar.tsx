'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { setMyTeam } from '@/lib/db';
import { TEAM_LIST, teamMeta } from '@/lib/teams';
import type { Role, Team } from '@/lib/types';
import { SummaryPanel } from '@/components/SummaryPanel';

const NAV = [
  { href: '/track', label: 'Track', icon: '⏱' },
  { href: '/calendar', label: 'Calendar', icon: '🗓' },
  { href: '/reports', label: 'Reports', icon: '📊' },
  { href: '/projects', label: 'Projects', icon: '🗂' },
];

const ROLE_LABEL: Record<Role, string> = { member: 'Member', manager: 'Manager', admin: 'Admin' };

export function Sidebar({
  userId,
  name,
  email,
  avatar,
  team,
  role,
}: {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  team: Team | null;
  role: Role;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const [savingTeam, setSavingTeam] = useState(false);
  const [pickingTeam, setPickingTeam] = useState(false);
  const meta = teamMeta(team);
  const elevated = role === 'manager' || role === 'admin';
  const firstName = name.split(' ')[0] || name;

  async function changeTeam(value: string) {
    if (value !== 'sales' && value !== 'ops') return;
    setSavingTeam(true);
    const supabase = createClient();
    try {
      await setMyTeam(supabase, userId, value);
      setPickingTeam(false);
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
        <button className="menu-toggle" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle menu">
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
        {elevated && (
          <Link
            href="/team"
            className={'nav-link' + (pathname.startsWith('/team') ? ' is-active' : '')}
          >
            <span className="nav-ico">👥</span>
            Team
          </Link>
        )}
      </nav>

      <div className="sidebar-calendar">
        <SummaryPanel userId={userId} />
      </div>

      <div className="side-spacer" />

      {/* Personalized profile card (lower-left) */}
      <div className="account-block">
        <div className="profile-card">
          <div className="profile-top">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="account-avatar" referrerPolicy="no-referrer" />
            ) : (
              <span className="account-avatar account-initial">{firstName.charAt(0).toUpperCase()}</span>
            )}
            <div className="account-main">
              <div className="account-name">{name}</div>
              <div className="account-sub">{email}</div>
            </div>
            <button className="signout-btn" onClick={signOut} title="Sign out">⎋</button>
          </div>

          <div className="profile-tags">
            {elevated && <span className="role-badge">{ROLE_LABEL[role]}</span>}

            {pickingTeam ? (
              <select
                className="team-select"
                value={team ?? ''}
                onChange={(e) => changeTeam(e.target.value)}
                disabled={savingTeam}
                autoFocus
                onBlur={() => setPickingTeam(false)}
                aria-label="Your team"
              >
                <option value="" disabled>Choose your team…</option>
                {TEAM_LIST.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            ) : (
              <button
                className={'team-chip' + (meta ? '' : ' is-none')}
                style={meta ? { color: meta.color, background: meta.tint } : undefined}
                onClick={() => setPickingTeam(true)}
                title="Set your team"
              >
                {meta ? `${meta.label} team` : 'Set your team'}
                <span className="team-chip-edit">✎</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
