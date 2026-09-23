(() => {
  const P = globalThis.PCR ||= {};
  P.C = Object.freeze({
    VERSION: 1, KEY: 'pcr-state', THRESHOLD_MIN: 0, THRESHOLD_MAX: 100,
    THRESHOLD_DEFAULT: 15, BATCH_SIZE: 250, BATCH_MIN: 20, BATCH_BUDGET_MS: 8, MUTATION_DELAY: 60,
    PSEUDOS: ['', '::before', '::after'],
    CACHE_LIMIT: 4096, MAX_PROFILES: 500, MAX_RULES: 100, MAX_IMPORT_BYTES: 2_000_000,
    PAGE_COLOR_SAMPLE_LIMIT: 2500, PAGE_COLOR_UNIQUE_LIMIT: 240, CONFUSION_SUGGESTION_LIMIT: 8,
    PORT: 'pcr-preview',
    PROPERTIES: ['color', 'background-color', 'border-top-color', 'border-right-color',
      'border-bottom-color', 'border-left-color', 'outline-color', 'text-decoration-color', 'fill', 'stroke'],
    SCRIPTS: ['utils/constants.js', 'utils/color.js', 'utils/domain.js', 'utils/model.js',
      'utils/storage.js', 'content/color-engine.js', 'content/dom-scanner.js', 'content/picker.js', 'content/content.js'],
    MSG: { GET: 'GET_CURRENT_PROFILE', WRITE: 'WRITE_SETTINGS', PREVIEW: 'PREVIEW_RULES',
      RESET: 'RESET_RULES', PICK: 'START_PICKER', STOP_PICK: 'STOP_PICKER', REFRESH: 'APPLY_RULES',
      REGISTER: 'REGISTER_SITES' }
  });
})();
