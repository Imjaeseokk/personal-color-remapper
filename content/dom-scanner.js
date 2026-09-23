(() => {
  const P = globalThis.PCR ||= {};
  const STATE_EVENTS = ['pointerover', 'pointerout', 'focusin', 'focusout', 'change', 'transitionend', 'animationend'];
  class DomScanner {
    constructor(engine) {
      this.engine = engine;
      this.marker = 'data-pcr-' + crypto.randomUUID();
      this.sheet = new CSSStyleSheet();
      this.records = new Map(); this.free = []; this.serial = 0;
      this.roots = new Set(); this.walkers = []; this.active = false;
      this.stats = { scanned: 0, matched: 0, batches: 0, totalMs: 0, maxBatchMs: 0 };
      this.batchSize = P.C.BATCH_SIZE;
      this.observer = new MutationObserver(records => this.mutations(records));
      this.onState = e => { this.enqueue(e.target); if (e.relatedTarget instanceof Element) this.enqueue(e.relatedTarget); };
      this.onResize = () => this.enqueue(document.documentElement);
      this.onLoad = e => { if (e.target instanceof HTMLLinkElement) this.enqueue(document.documentElement); };
    }
    ignored(el) { return !(el instanceof Element) || el.closest('[data-pcr-ui]') || /^(SCRIPT|STYLE|LINK|META|HEAD|TITLE|NOSCRIPT)$/.test(el.tagName); }
    observe() { this.observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true }); }
    setRules(rules) {
      this.stop(); this.engine.setRules(rules);
      if (!rules.length) return;
      this.active = true; document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.sheet];
      this.observe();
      for (const event of STATE_EVENTS) document.addEventListener(event, this.onState, true);
      window.addEventListener('resize', this.onResize); document.addEventListener('load', this.onLoad, true);
      this.enqueue(document.documentElement);
    }
    containsStylesheet(node) {
      return node instanceof Element && (node.matches('style,link[rel="stylesheet"]') || node.querySelector('style,link[rel="stylesheet"]'));
    }
    mutations(records) {
      if (!this.active) return;
      let removed = false;
      for (const m of records) {
        if (m.target instanceof Element && m.target.closest('[data-pcr-ui]')) continue;
        if (m.type === 'attributes') {
          if (m.attributeName === this.marker) continue;
          this.enqueue(m.target);
        } else if (m.type === 'childList') {
          for (const node of m.addedNodes) {
            if (this.containsStylesheet(node)) this.enqueue(document.documentElement);
            else this.enqueue(node);
          }
          for (const node of m.removedNodes) if (this.containsStylesheet(node)) this.enqueue(document.documentElement);
          if ([...m.addedNodes, ...m.removedNodes].some(n => n.nodeType === Node.TEXT_NODE)) this.enqueue(m.target);
          removed ||= m.removedNodes.length > 0;
        } else if (m.type === 'characterData') {
          this.enqueue(m.target.parentElement);
        }
        if (m.target.nodeName === 'STYLE' || m.target.parentElement?.nodeName === 'STYLE' || m.target.nodeName === 'LINK') this.enqueue(document.documentElement);
      }
      if (removed) for (const [el] of this.records) if (!el.isConnected) this.remove(el);
    }
    enqueue(node) {
      if (!this.active || !(node instanceof Element) || !node.isConnected || this.ignored(node)) return;
      for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) if (this.roots.has(ancestor)) return;
      if (node.childElementCount) for (const root of this.roots) if (node.contains(root)) this.roots.delete(root);
      this.roots.add(node);
      if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.flush(); }, P.C.MUTATION_DELAY);
    }
    release(rule) { rule.style.cssText = ''; this.free.push(rule); }
    remove(el) {
      const record = this.records.get(el); if (!record) return;
      for (const rule of record.rules.values()) this.release(rule);
      el.removeAttribute(this.marker); this.records.delete(el);
      this.stats.matched = this.records.size;
    }
    flush() {
      if (!this.active) return;
      const started = performance.now();
      for (const root of this.roots) this.walkers.push({ root, walker: document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT), first: true });
      this.roots.clear();
      const elements = new Set();
      while (this.walkers.length && elements.size < this.batchSize) {
        const work = this.walkers[0];
        const node = work.first ? (work.first = false, work.root) : work.walker.nextNode();
        if (!node) { this.walkers.shift(); continue; }
        if (node.isConnected && !this.ignored(node)) elements.add(node);
      }
      // Read all original element and generated-content styles without our overlay.
      this.sheet.disabled = true;
      const updates = [];
      try {
        for (const el of elements) {
          const scopes = new Map();
          for (const pseudo of P.C.PSEUDOS) {
            const computed = getComputedStyle(el, pseudo || null);
            if (pseudo && (computed.content === 'none' || computed.content === 'normal' || computed.display === 'none')) continue;
            const declarations = [];
            for (const property of P.C.PROPERTIES) {
              const replacement = this.engine.transform(computed.getPropertyValue(property));
              if (replacement) declarations.push(property + ':' + replacement + '!important');
            }
            if (declarations.length) scopes.set(pseudo, declarations.join(';'));
          }
          updates.push([el, scopes]); this.stats.scanned++;
        }
      } finally { this.sheet.disabled = false; }
      // Preserve external records, then ignore only our synchronous marker writes.
      this.mutations(this.observer.takeRecords()); this.observer.disconnect();
      try {
        for (const [el, scopes] of updates) {
          if (!scopes.size) { this.remove(el); continue; }
          let record = this.records.get(el);
          if (!record) {
            const id = String(++this.serial); el.setAttribute(this.marker, id);
            record = { id, rules: new Map(), declarations: new Map() }; this.records.set(el, record);
          }
          for (const [pseudo, rule] of record.rules) if (!scopes.has(pseudo)) {
            this.release(rule); record.rules.delete(pseudo); record.declarations.delete(pseudo);
          }
          for (const [pseudo, declarations] of scopes) {
            let rule = record.rules.get(pseudo);
            if (!rule) {
              rule = this.free.pop();
              const selector = '[' + this.marker + '="' + record.id + '"]:is([' + this.marker + '],#pcr-specificity):is([' + this.marker + '],#pcr-specificity-2)' + pseudo;
              if (rule) rule.selectorText = selector;
              else { const index = this.sheet.insertRule(selector + '{}', this.sheet.cssRules.length); rule = this.sheet.cssRules[index]; }
              record.rules.set(pseudo, rule);
            }
            if (record.declarations.get(pseudo) !== declarations) {
              rule.style.cssText = declarations; record.declarations.set(pseudo, declarations);
            }
          }
        }
      } finally { if (this.active) this.observe(); }
      this.stats.matched = this.records.size; this.stats.batches++;
      const elapsed = performance.now() - started;
      this.stats.totalMs += elapsed; this.stats.maxBatchMs = Math.max(this.stats.maxBatchMs, elapsed);
      this.batchSize = Math.max(P.C.BATCH_MIN, Math.min(P.C.BATCH_SIZE, Math.floor(this.batchSize * P.C.BATCH_BUDGET_MS / Math.max(elapsed, 1))));
      if (this.walkers.length && !this.timer) this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 0);
    }
    originalColors(el) {
      this.sheet.disabled = true;
      try {
        const style = getComputedStyle(el);
        return P.C.PROPERTIES.map(property => ({ property, color: this.engine.parse(style.getPropertyValue(property))?.rgb })).filter(x => x.color && x.color.a > 0);
      } finally { this.sheet.disabled = false; }
    }
    confusingColors(limit = P.C.CONFUSION_SUGGESTION_LIMIT) {
      const counts = new Map(); let sampled = 0;
      this.sheet.disabled = true;
      try {
        const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_ELEMENT);
        for (let el = walker.currentNode; el && sampled < P.C.PAGE_COLOR_SAMPLE_LIMIT; el = walker.nextNode()) {
          if (this.ignored(el)) continue;
          const rect = el.getBoundingClientRect();
          if (!rect.width || !rect.height) continue;
          sampled++;
          const style = getComputedStyle(el);
          for (const property of P.C.PROPERTIES) {
            const rgb = this.engine.parse(style.getPropertyValue(property))?.rgb;
            if (!rgb || rgb.a < 0.1) continue;
            const hex = P.Color.rgbToHex(rgb); counts.set(hex, (counts.get(hex) || 0) + 1);
          }
        }
      } finally { this.sheet.disabled = false; }
      const entries = [...counts].map(([hex, count]) => ({ hex, count })).sort((a, b) => b.count - a.count).slice(0, P.C.PAGE_COLOR_UNIQUE_LIMIT);
      return { sampled, unique: counts.size, suggestions: P.Color.confusionCandidates(entries, limit) };
    }
    getStats() {
      return { ...this.stats, active: this.active, pending: this.roots.size + this.walkers.length,
        retainedElements: this.records.size, cssRuleSlots: this.sheet.cssRules.length,
        freeSlots: this.free.length, batchSize: this.batchSize };
    }
    stop() {
      this.active = false; this.observer.disconnect(); clearTimeout(this.timer); this.timer = null;
      this.roots.clear(); this.walkers = [];
      for (const el of this.records.keys()) el.removeAttribute(this.marker);
      this.records.clear(); this.free = []; this.sheet.replaceSync(''); this.sheet.disabled = false;
      this.stats.matched = 0; this.batchSize = P.C.BATCH_SIZE;
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== this.sheet);
      for (const event of STATE_EVENTS) document.removeEventListener(event, this.onState, true);
      window.removeEventListener('resize', this.onResize); document.removeEventListener('load', this.onLoad, true);
    }
  }
  P.DomScanner = DomScanner;
})();
