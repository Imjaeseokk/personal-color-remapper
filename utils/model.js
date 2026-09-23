(() => {
  const P = globalThis.PCR ||= {};
  const { C, Color, Domain } = P;
  const profile = (name = 'My palette') => ({ enabled: true, name, rules: [] });
  const defaults = () => ({ version: C.VERSION, settings: { enabled: true }, globalProfile: { ...profile('Global palette'), enabled: false }, profiles: {} });
  const defaultRuleName = (index, scope = 'global') => `rule_${index + 1}_${scope || 'global'}`;
  const rule = (source = '#28A745', index = 0, scope = 'global') => ({ id: crypto.randomUUID(),
    name: defaultRuleName(index, scope), customName: false, enabled: true, source, target: '#2979FF', threshold: C.THRESHOLD_DEFAULT });
  function validate(input) {
    const fail = msg => { throw new Error(`Invalid settings: ${msg}`); };
    const object = v => v && typeof v === 'object' && !Array.isArray(v);
    if (!object(input) || input.version !== C.VERSION) fail('unsupported version');
    if (!object(input.settings) || typeof input.settings.enabled !== 'boolean') fail('enabled must be boolean');
    function checkProfile(p, scope) {
      if (!object(p) || typeof p.enabled !== 'boolean' || typeof p.name !== 'string' || p.name.length > 100 || !Array.isArray(p.rules) || p.rules.length > C.MAX_RULES) fail('malformed profile');
      const ids = new Set();
      return { enabled: p.enabled, name: p.name, rules: p.rules.map((r, index) => {
        if (!object(r) || typeof r.id !== 'string' || !r.id || r.id.length > 100 || ids.has(r.id) || typeof r.enabled !== 'boolean') fail('malformed or duplicate rule');
        ids.add(r.id);
        if (![r.source, r.target].every(c => typeof c === 'string' && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(c))) fail('use opaque HEX source/target colors');
        if (!Number.isFinite(r.threshold) || r.threshold < C.THRESHOLD_MIN || r.threshold > C.THRESHOLD_MAX) fail('threshold out of range');
        const customName = r.customName === true;
        const name = customName && typeof r.name === 'string' && r.name.trim() ? r.name.trim() : defaultRuleName(index, scope);
        if (name.length > 120) fail('rule name is too long');
        return { id: r.id, name, customName, enabled: r.enabled, source: Color.rgbToHex(Color.hexToRgb(r.source)), target: Color.rgbToHex(Color.hexToRgb(r.target)), threshold: r.threshold };
      }) };
    }
    if (!object(input.profiles) || Object.keys(input.profiles).length > C.MAX_PROFILES) fail('invalid profiles');
    const profiles = {};
    for (const [host, p] of Object.entries(input.profiles)) {
      if (!Domain.validHost(host)) fail('invalid hostname');
      profiles[host] = checkProfile(p, host);
    }
    return { version: C.VERSION, settings: { enabled: input.settings.enabled }, globalProfile: checkProfile(input.globalProfile, 'global'), profiles };
  }
  function effective(state, host) {
    if (!state.settings.enabled) return [];
    const local = state.profiles[host];
    if (local && !local.enabled) return []; // Explicit per-site OFF also blocks global rules.
    return [...(local?.rules || []), ...(state.globalProfile.enabled ? state.globalProfile.rules : [])].filter(r => r.enabled);
  }
  function importJSON(text) {
    if (new TextEncoder().encode(text).length > C.MAX_IMPORT_BYTES) throw new Error('Import is too large (2 MB maximum).');
    const raw = JSON.parse(text);
    if (raw.schemaVersion !== C.VERSION) throw new Error('Unsupported export schema version.');
    return validate({ ...raw, version: raw.schemaVersion });
  }
  function exportJSON(state) {
    const { version, ...rest } = validate(state);
    return JSON.stringify({ schemaVersion: version, exportedAt: new Date().toISOString(), ...rest }, null, 2);
  }
  P.Model = { profile, defaults, rule, defaultRuleName, validate, effective, importJSON, exportJSON };
})();
