/* store.js — persistence layer over localStorage.
 * All data lives client-side so the app works offline with zero setup. */
(function (global) {
  'use strict';

  const KEY = 'timeit.state.v1';

  const DEFAULT_STATE = {
    projects: [
      { id: 'p_general', name: 'General', color: '#4f86f7' }
    ],
    entries: [],   // { id, description, projectId, start (ms), end (ms|null) }
    running: null, // id of the currently running entry, or null
    settings: { theme: 'light' }
  };

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      // Merge so new default fields appear after upgrades.
      return Object.assign(structuredClone(DEFAULT_STATE), parsed);
    } catch (e) {
      console.warn('Could not load state, starting fresh.', e);
      return structuredClone(DEFAULT_STATE);
    }
  }

  let state = load();
  const listeners = new Set();

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to persist state', e);
    }
    listeners.forEach((fn) => fn(state));
  }

  const Store = {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get() { return state; },

    /* ---- Projects ---- */
    getProjects() { return state.projects; },
    getProject(id) { return state.projects.find((p) => p.id === id) || null; },
    addProject(name, color) {
      const project = { id: uid('p'), name: name.trim(), color };
      state.projects.push(project);
      persist();
      return project;
    },
    deleteProject(id) {
      if (state.projects.length <= 1) return false; // keep at least one
      state.projects = state.projects.filter((p) => p.id !== id);
      // Reassign orphaned entries to the first remaining project.
      const fallback = state.projects[0].id;
      state.entries.forEach((e) => { if (e.projectId === id) e.projectId = fallback; });
      persist();
      return true;
    },

    /* ---- Entries ---- */
    getEntries() { return state.entries; },
    getEntry(id) { return state.entries.find((e) => e.id === id) || null; },
    getRunningEntry() { return state.running ? this.getEntry(state.running) : null; },

    startTimer(description, projectId) {
      if (state.running) this.stopTimer();
      const entry = {
        id: uid('e'),
        description: (description || '').trim(),
        projectId: projectId || state.projects[0].id,
        start: Date.now(),
        end: null
      };
      state.entries.push(entry);
      state.running = entry.id;
      persist();
      return entry;
    },
    stopTimer() {
      if (!state.running) return null;
      const entry = this.getEntry(state.running);
      if (entry) entry.end = Date.now();
      state.running = null;
      persist();
      return entry;
    },
    updateEntry(id, fields) {
      const entry = this.getEntry(id);
      if (!entry) return null;
      Object.assign(entry, fields);
      persist();
      return entry;
    },
    addManualEntry(description, projectId, start, end) {
      const entry = {
        id: uid('e'),
        description: (description || '').trim(),
        projectId: projectId || state.projects[0].id,
        start, end
      };
      state.entries.push(entry);
      persist();
      return entry;
    },
    deleteEntry(id) {
      state.entries = state.entries.filter((e) => e.id !== id);
      if (state.running === id) state.running = null;
      persist();
    },

    /* ---- Settings ---- */
    setSetting(key, value) { state.settings[key] = value; persist(); },
    getSetting(key) { return state.settings[key]; }
  };

  global.Store = Store;
})(window);
