/* reports.js — time totals by range, per-project breakdown, and CSV export. */
(function (global) {
  'use strict';

  // Inclusive start-of-range timestamps (local time).
  function rangeStart(range) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (range === 'week') {
      // Week starts Monday.
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
    } else if (range === 'month') {
      d.setDate(1);
    }
    return d.getTime();
  }

  function completedEntriesInRange(range) {
    const start = rangeStart(range);
    return Store.getEntries().filter((e) => e.end != null && e.start >= start);
  }

  const Reports = {
    summarize(range) {
      const entries = completedEntriesInRange(range);
      let total = 0;
      const byProject = new Map();
      entries.forEach((e) => {
        const dur = e.end - e.start;
        total += dur;
        byProject.set(e.projectId, (byProject.get(e.projectId) || 0) + dur);
      });
      const breakdown = Array.from(byProject.entries())
        .map(([projectId, ms]) => {
          const p = Store.getProject(projectId);
          return { name: p ? p.name : 'Unknown', color: p ? p.color : '#999', ms };
        })
        .sort((a, b) => b.ms - a.ms);
      return { total, breakdown };
    },

    render(range, totalEl, breakdownEl) {
      const { total, breakdown } = this.summarize(range);
      totalEl.textContent = Fmt.duration(total);
      breakdownEl.innerHTML = '';

      if (!total) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'No time tracked in this range yet.';
        breakdownEl.appendChild(empty);
        return;
      }

      breakdown.forEach((row) => {
        const wrapRow = document.createElement('div');
        wrapRow.className = 'report-row';

        const dot = document.createElement('span');
        dot.className = 'entry-dot';
        dot.style.background = row.color;
        wrapRow.appendChild(dot);

        const barWrap = document.createElement('div');
        barWrap.className = 'report-bar-wrap';

        const top = document.createElement('div');
        top.className = 'report-bar-top';
        const name = document.createElement('span');
        name.className = 'report-bar-name';
        name.textContent = row.name;
        const time = document.createElement('span');
        time.className = 'report-bar-time';
        time.textContent = Fmt.durationShort(row.ms) +
          ' · ' + Math.round((row.ms / total) * 100) + '%';
        top.appendChild(name);
        top.appendChild(time);
        barWrap.appendChild(top);

        const bar = document.createElement('div');
        bar.className = 'report-bar';
        const fill = document.createElement('div');
        fill.className = 'report-bar-fill';
        fill.style.width = (row.ms / total) * 100 + '%';
        fill.style.background = row.color;
        bar.appendChild(fill);
        barWrap.appendChild(bar);

        wrapRow.appendChild(barWrap);
        breakdownEl.appendChild(wrapRow);
      });
    },

    exportCsv(range) {
      const entries = completedEntriesInRange(range)
        .slice()
        .sort((a, b) => a.start - b.start);
      const rows = [['Project', 'Description', 'Start', 'End', 'Duration (h)']];
      entries.forEach((e) => {
        const p = Store.getProject(e.projectId);
        const hours = ((e.end - e.start) / 3600000).toFixed(2);
        rows.push([
          p ? p.name : 'Unknown',
          e.description || '',
          new Date(e.start).toLocaleString(),
          new Date(e.end).toLocaleString(),
          hours
        ]);
      });
      const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'timeit-' + range + '-' + Fmt.dayKey(Date.now()) + '.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  function csvCell(value) {
    const s = String(value);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  global.Reports = Reports;
})(window);
