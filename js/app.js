/* app.js — wires the views, timer, and store together. */
(function () {
  'use strict';

  // ---- Element refs ----
  const $ = (sel) => document.querySelector(sel);
  const tabs = document.querySelectorAll('.tab');
  const views = { track: $('#view-track'), reports: $('#view-reports'), projects: $('#view-projects') };

  const descInput = $('#timer-description');
  const projectSelect = $('#timer-project');
  const readout = $('#timer-readout');
  const startStopBtn = $('#start-stop-btn');
  const startIcon = startStopBtn.querySelector('.start-icon');

  const entriesList = $('#entries-list');
  const entriesEmpty = $('#entries-empty');
  const manualAddBtn = $('#manual-add-btn');

  const reportTotalValue = $('#report-total-value');
  const reportBreakdown = $('#report-breakdown');
  const exportBtn = $('#export-btn');
  const rangeChips = document.querySelectorAll('.chip');

  const projectForm = $('#project-form');
  const newProjectName = $('#new-project-name');
  const newProjectColor = $('#new-project-color');
  const projectManageList = $('#project-manage-list');

  const themeToggle = $('#theme-toggle');

  // Modal refs
  const modal = $('#entry-modal');
  const editDescription = $('#edit-description');
  const editProject = $('#edit-project');
  const editStart = $('#edit-start');
  const editEnd = $('#edit-end');
  const editDelete = $('#edit-delete');
  const editCancel = $('#edit-cancel');
  const editSave = $('#edit-save');
  const modalTitle = $('#entry-modal-title');

  let currentRange = 'day';
  let editingId = null;       // id of entry being edited, or null for a new manual entry
  let activeView = 'track';

  // ---- Views / tabs ----
  function showView(name) {
    activeView = name;
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.view === name));
    Object.entries(views).forEach(([k, v]) => v.classList.toggle('is-active', k === name));
    if (name === 'reports') renderReports();
    if (name === 'projects') renderProjects();
  }
  tabs.forEach((t) => t.addEventListener('click', () => showView(t.dataset.view)));

  // ---- Timer ----
  function refreshTimerUI() {
    const running = Store.getRunningEntry();
    const isRunning = !!running;
    startStopBtn.classList.toggle('is-running', isRunning);
    startIcon.textContent = isRunning ? '■' : '▶';
    startStopBtn.setAttribute('aria-label', isRunning ? 'Stop timer' : 'Start timer');
    if (isRunning) {
      // Reflect the running entry's description/project without clobbering typing.
      if (document.activeElement !== descInput) descInput.value = running.description;
      projectSelect.value = running.projectId;
    }
  }

  function toggleTimer() {
    const running = Store.getRunningEntry();
    if (running) {
      Store.stopTimer();
    } else {
      Store.startTimer(descInput.value, projectSelect.value);
      descInput.value = '';
    }
  }

  startStopBtn.addEventListener('click', toggleTimer);

  // Enter in the description box starts/stops the timer.
  descInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); toggleTimer(); }
  });

  // Editing description/project while running updates the live entry.
  descInput.addEventListener('input', () => {
    const running = Store.getRunningEntry();
    if (running) Store.updateEntry(running.id, { description: descInput.value });
  });
  projectSelect.addEventListener('change', () => {
    const running = Store.getRunningEntry();
    if (running) Store.updateEntry(running.id, { projectId: projectSelect.value });
  });

  Timer.init((elapsed) => {
    readout.textContent = elapsed == null ? '0:00:00' : Fmt.duration(elapsed);
  });

  // ---- Track entries ----
  function resumeEntry(entry) {
    Store.startTimer(entry.description, entry.projectId);
    showView('track');
    descInput.value = '';
  }

  function renderTrack() {
    UI.fillProjectSelect(projectSelect, Store.getRunningEntry()?.projectId);
    UI.renderEntries(entriesList, entriesEmpty, openEditModal, resumeEntry);
    refreshTimerUI();
  }

  // ---- Reports ----
  function renderReports() { Reports.render(currentRange, reportTotalValue, reportBreakdown); }
  rangeChips.forEach((chip) => chip.addEventListener('click', () => {
    currentRange = chip.dataset.range;
    rangeChips.forEach((c) => c.classList.toggle('is-active', c === chip));
    renderReports();
  }));
  exportBtn.addEventListener('click', () => Reports.exportCsv(currentRange));

  // ---- Projects ----
  function renderProjects() {
    UI.renderProjectManageList(projectManageList, (project) => {
      if (!confirm('Delete "' + project.name + '"? Its entries move to ' + Store.getProjects()[0].name + '.')) return;
      if (!Store.deleteProject(project.id)) alert('You need at least one project.');
    });
  }
  projectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = newProjectName.value.trim();
    if (!name) return;
    Store.addProject(name, newProjectColor.value);
    newProjectName.value = '';
  });

  // ---- Edit / manual-add modal ----
  function openEditModal(entry) {
    editingId = entry.id;
    modalTitle.textContent = 'Edit entry';
    editDescription.value = entry.description;
    UI.fillProjectSelect(editProject, entry.projectId);
    editStart.value = Fmt.toDatetimeLocal(entry.start);
    editEnd.value = Fmt.toDatetimeLocal(entry.end);
    editDelete.style.display = '';
    modal.hidden = false;
  }

  function openManualAddModal() {
    editingId = null;
    modalTitle.textContent = 'Add time';
    editDescription.value = '';
    UI.fillProjectSelect(editProject, Store.getProjects()[0].id);
    const now = Date.now();
    editStart.value = Fmt.toDatetimeLocal(now - 3600000); // default: 1h block
    editEnd.value = Fmt.toDatetimeLocal(now);
    editDelete.style.display = 'none';
    modal.hidden = false;
  }

  function closeModal() { modal.hidden = true; editingId = null; }

  manualAddBtn.addEventListener('click', openManualAddModal);
  editCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  editSave.addEventListener('click', () => {
    const start = Fmt.fromDatetimeLocal(editStart.value);
    const end = Fmt.fromDatetimeLocal(editEnd.value);
    if (isNaN(start) || isNaN(end)) { alert('Please enter valid start and end times.'); return; }
    if (end < start) { alert('End time must be after the start time.'); return; }
    const fields = {
      description: editDescription.value,
      projectId: editProject.value,
      start, end
    };
    if (editingId) Store.updateEntry(editingId, fields);
    else Store.addManualEntry(fields.description, fields.projectId, start, end);
    closeModal();
  });

  editDelete.addEventListener('click', () => {
    if (editingId && confirm('Delete this entry?')) { Store.deleteEntry(editingId); closeModal(); }
  });

  // ---- Theme ----
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.textContent = theme === 'dark' ? '☀' : '◐';
  }
  themeToggle.addEventListener('click', () => {
    const next = Store.getSetting('theme') === 'dark' ? 'light' : 'dark';
    Store.setSetting('theme', next);
    applyTheme(next);
  });

  // ---- React to store changes ----
  Store.subscribe(() => {
    renderTrack();
    Timer.sync();
    if (activeView === 'reports') renderReports();
    if (activeView === 'projects') renderProjects();
  });

  // ---- Boot ----
  applyTheme(Store.getSetting('theme') || 'light');
  renderTrack();
  Timer.sync();
})();
