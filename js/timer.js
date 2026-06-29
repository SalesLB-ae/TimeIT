/* timer.js — drives the live ticking readout for the running entry. */
(function (global) {
  'use strict';

  let intervalId = null;
  let onTick = null;

  const Timer = {
    // cb receives elapsed ms for the running entry, or null if none.
    init(cb) { onTick = cb; },

    sync() {
      const running = Store.getRunningEntry();
      if (running) {
        this.start();
        this.tick();
      } else {
        this.stop();
        if (onTick) onTick(null);
      }
    },

    tick() {
      const running = Store.getRunningEntry();
      if (!running) { this.stop(); if (onTick) onTick(null); return; }
      if (onTick) onTick(Date.now() - running.start);
      // Keep the document title live so it works as an ambient timer.
      document.title = Fmt.duration(Date.now() - running.start) + ' · TimeIT';
    },

    start() {
      if (intervalId) return;
      intervalId = setInterval(() => this.tick(), 1000);
    },

    stop() {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      document.title = 'TimeIT — simple time tracking';
    }
  };

  global.Timer = Timer;
})(window);
