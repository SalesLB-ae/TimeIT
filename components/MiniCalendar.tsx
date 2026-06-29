'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchMyEntriesBetween } from '@/lib/db';
import { ymd, monthMatrix, matrixRange, WEEKDAYS, MONTHS } from '@/lib/calendar';

// Compact month calendar for the sidebar. Days where YOU logged time show a
// dot; clicking a day opens the Calendar view for that date. Private to you.
export function MiniCalendar({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const todayStr = ymd(new Date());
  const selected = params.get('date');
  const initial = selected ? new Date(selected) : new Date();

  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const { startIso, endIso } = matrixRange(year, month);
    fetchMyEntriesBetween(supabase, userId, startIso, endIso)
      .then((entries) => {
        if (cancelled) return;
        const days = new Set<string>();
        for (const e of entries) days.add(ymd(new Date(e.started_at)));
        setActiveDays(days);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, year, month]);

  const cells = monthMatrix(year, month);

  function prev() {
    const d = new Date(year, month - 1, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }
  function next() {
    const d = new Date(year, month + 1, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }
  function pick(d: Date) {
    router.push(`/calendar?date=${ymd(d)}`);
  }

  return (
    <div className="calendar glass">
      <div className="cal-head">
        <button className="cal-nav" onClick={prev} aria-label="Previous month">‹</button>
        <span className="cal-title">{MONTHS[month]} {year}</span>
        <button className="cal-nav" onClick={next} aria-label="Next month">›</button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w) => (
          <div className="cal-dow" key={w}>{w[0]}</div>
        ))}
        {cells.map((d) => {
          const key = ymd(d);
          const isOther = d.getMonth() !== month;
          const isToday = key === todayStr;
          const isSelected = key === selected && pathname === '/calendar';
          return (
            <button
              key={key}
              className={
                'cal-cell' +
                (isOther ? ' is-other' : '') +
                (isToday ? ' is-today' : '') +
                (isSelected ? ' is-selected' : '')
              }
              onClick={() => pick(d)}
            >
              {d.getDate()}
              {activeDays.has(key) && <span className="cal-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
