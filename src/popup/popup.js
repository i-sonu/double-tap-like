/*
 * popup.js — UI ONLY. Reads/writes chrome.storage via DCL.config. No like logic,
 * no DOM scraping of host pages. State reflects storage on open and persists on toggle.
 */
(function () {
  'use strict';

  const config = (globalThis.DCL && globalThis.DCL.config) || null;
  if (!config) {
    console.error('[DCL popup] config.js not loaded');
    return;
  }

  const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][data-platform]'));
  const masterInput = document.getElementById('toggle-master');

  function reflect(enabled) {
    for (const input of inputs) {
      const name = input.dataset.platform;
      input.checked = !!enabled[name];
    }
    applyMasterState();
  }

  // When master is off, platform rows are visually/functionally disabled.
  function applyMasterState() {
    const masterOn = !!(masterInput && masterInput.checked);
    for (const input of inputs) {
      if (input === masterInput) continue;
      input.disabled = !masterOn;
      const row = input.closest('.dcl-row');
      if (row) row.classList.toggle('dcl-row--disabled', !masterOn);
    }
  }

  function onToggle(event) {
    const input = event.target;
    const name = input.dataset.platform;
    if (!name) return;
    config.setPlatform(name, input.checked).then(() => {
      if (name === 'master') applyMasterState();
    });
  }

  config.getEnabled().then(reflect);
  for (const input of inputs) {
    input.addEventListener('change', onToggle);
  }
})();
