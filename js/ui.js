/* ui.js — rendering helpers for the Track and Projects views + the edit modal. */
(function (global) {
  'use strict';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function entryDuration(entry) {
    const end = entry.end == null ? Date.now() : entry.end;
    return end - entry.start;
  }

  const UI = {
    /* ---- Project <select> options ---- */
    fillProjectSelect(select, selectedId) {
      select.innerHTML = '';
      Store.getProjects().forEach((p) => {
        const opt = el('option', null, p.name);
        opt.value = p.id;
        if (p.id === selectedId) opt.selected = true;
        select.appendChild(opt);
      });
    },

    /* ---- Track view: entries grouped by day ---- */
    renderEntries(container, emptyState, onEdit, onResume) {
      const entries = Store.getEntries()
        .filter((e) => e.end != null) // running entry shown in the timer bar, not the list
        .slice()
        .sort((a, b) => b.start - a.start);

      container.innerHTML = '';
      if (!entries.length) {
        if (emptyState) container.appendChild(emptyState);
        return;
      }

      // Group by local day.
      const groups = new Map();
      entries.forEach((e) => {
        const key = Fmt.dayKey(e.start);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(e);
      });

      groups.forEach((groupEntries) => {
        const total = groupEntries.reduce((sum, e) => sum + entryDuration(e), 0);
        const group = el('div', 'day-group');
        const header = el('div', 'day-header');
        header.appendChild(el('span', null, Fmt.dayLabel(groupEntries[0].start)));
        header.appendChild(el('span', 'day-total', Fmt.durationShort(total)));
        group.appendChild(header);

        groupEntries.forEach((e) => group.appendChild(this.renderEntryRow(e, onEdit, onResume)));
        container.appendChild(group);
      });
    },

    renderEntryRow(entry, onEdit, onResume) {
      const project = Store.getProject(entry.projectId);
      const row = el('div', 'entry');

      const dot = el('span', 'entry-dot');
      dot.style.background = project ? project.color : '#999';
      row.appendChild(dot);

      const main = el('div', 'entry-main');
      const desc = el('div', 'entry-desc' + (entry.description ? '' : ' is-empty'),
        entry.description || 'No description');
      main.appendChild(desc);
      const meta = el('div', 'entry-meta',
        (project ? project.name + ' · ' : '') +
        Fmt.clockTime(entry.start) + ' – ' + Fmt.clockTime(entry.end));
      main.appendChild(meta);
      row.appendChild(main);

      row.appendChild(el('span', 'entry-duration', Fmt.duration(entryDuration(entry))));

      const resume = el('button', 'entry-resume', '▶');
      resume.title = 'Resume this task';
      resume.addEventListener('click', (ev) => { ev.stopPropagation(); onResume(entry); });
      row.appendChild(resume);

      row.addEventListener('click', () => onEdit(entry));
      return row;
    },

    /* ---- Projects view ---- */
    renderProjectManageList(container, onDelete) {
      container.innerHTML = '';
      Store.getProjects().forEach((p) => {
        const row = el('li', 'project-manage-row');
        const dot = el('span', 'entry-dot');
        dot.style.background = p.color;
        row.appendChild(dot);
        row.appendChild(el('span', 'project-manage-name', p.name));

        const del = el('button', 'project-delete', '🗑');
        del.title = 'Delete project';
        del.addEventListener('click', () => onDelete(p));
        row.appendChild(del);
        container.appendChild(row);
      });
    }
  };

  UI.entryDuration = entryDuration;
  global.UI = UI;
})(window);
