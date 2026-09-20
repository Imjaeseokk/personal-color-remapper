(() => {
  const P = globalThis.PCR ||= {};
  class ColorEngine {
    constructor(parser = P.Color.parseCss) { this.parser = parser; this.cache = new Map(); this.setRules([]); }
    setRules(rules) {
      this.rules = rules.filter(r => r.enabled).map(r => ({ ...r,
        lab: P.Color.toOklab(P.Color.hexToRgb(r.source)), targetRgb: P.Color.hexToRgb(r.target) }));
      this.results = new Map();
    }
    parse(value) {
      if (this.cache.has(value)) return this.cache.get(value);
      const rgb = this.parser(value);
      const entry = rgb ? { rgb, lab: P.Color.toOklab(rgb) } : null;
      if (this.cache.size >= P.C.CACHE_LIMIT) this.cache.clear();
      this.cache.set(value, entry); return entry;
    }
    transform(value) {
      if (this.results.has(value)) return this.results.get(value);
      const original = this.parse(value);
      const match = original && original.rgb.a > 0 && this.rules.find(r => P.Color.distance(original.lab, r.lab) <= r.threshold + 1e-8);
      const result = match ? P.Color.css({ ...match.targetRgb, a: original.rgb.a }) : null;
      if (this.results.size >= P.C.CACHE_LIMIT) this.results.clear();
      this.results.set(value, result); return result;
    }
  }
  P.ColorEngine = ColorEngine;
})();
