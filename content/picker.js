(() => {
  const P = globalThis.PCR;
  class PagePicker {
    constructor({ scanner, host, state, preview, cancel }) { Object.assign(this, { scanner, host, state, preview, cancel }); }
    start() {
      this.previousFocus = document.activeElement;
      this.hostElement = document.createElement('div'); this.hostElement.dataset.pcrUi = '';
      this.hostElement.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important';
      const root = this.hostElement.attachShadow({ mode: 'closed' });
      root.innerHTML = `<style>
        :host{font:14px/1.5 system-ui;color:#172332}*{box-sizing:border-box}
        section{position:fixed;right:18px;top:18px;width:330px;max-height:90vh;overflow:auto;background:#fff;color:#172332;border:2px solid #243b53;border-radius:16px;padding:18px;pointer-events:auto;box-shadow:0 8px 36px #0003}
        h2{font-size:17px;margin:0 0 8px}p{font-size:13px}label{display:block;margin:10px 0}input,select,button{font:inherit;max-width:100%}input[type=text],select{padding:7px;border:1px solid #637083;border-radius:6px;width:100%}
        button{padding:9px 12px;background:#edf1f6;color:#172332;border:1px solid #748094;border-radius:8px;cursor:pointer;margin:4px 2px}button.primary{background:#203f73;color:white}button:disabled{opacity:.5;cursor:default}
        :focus-visible{outline:3px solid #805800;outline-offset:3px}input[type=range]{width:100%}
        #box{position:fixed;border:3px dashed #111;outline:2px solid white;pointer-events:none;display:none}
        #notice{min-height:22px}small{display:block}
      </style><div id="box"></div><section role="dialog" aria-label="Choose and replace a page color">
        <h2>Pick your color</h2><p>Click a page element, or Tab to an element and press Enter. Escape cancels.</p>
        <button id="native">Screen eyedropper</button><button id="cancel">Cancel</button>
        <label>Element color property<select id="property" aria-label="Selected element color property"><option>Select a page element first</option></select></label>
        <label>Source HEX<input id="source" type="text" value="#28A745" maxlength="7"></label>
        <label>Replace with<input id="target" type="color" value="#2979ff" aria-label="Replacement color"><input id="hex" type="text" value="#2979FF" maxlength="7" aria-label="Replacement HEX"></label>
        <label>Similarity <output id="value">${P.C.THRESHOLD_DEFAULT}</output><input id="range" type="range" min="${P.C.THRESHOLD_MIN}" max="${P.C.THRESHOLD_MAX}" value="${P.C.THRESHOLD_DEFAULT}"></label>
        <small>0 = exact · 15 = nearby · 100 = very broad</small>
        <button id="preview" class="primary">Preview</button><button id="save" class="primary" disabled>Add rule & save</button>
        <p id="notice" role="status" aria-live="polite">DOM picker reads original CSS colors. Screen eyedropper reads visible pixels.</p>
      </section>`;
      document.documentElement.append(this.hostElement);
      this.$ = id => root.getElementById(id);
      this.selected = false; this.previewing = false;
      this.profile = structuredClone(this.state.profiles[this.host] || P.Model.profile(this.host));
      this.newRule = P.Model.rule();
      this.hover = e => {
        if (this.previewing || e.composedPath().includes(this.hostElement) || !(e.target instanceof Element)) return;
        const rect = e.target.getBoundingClientRect();
        this.$('box').style.cssText = `display:block;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;
      };
      this.choose = e => {
        if (this.previewing || e.composedPath().includes(this.hostElement) || !(e.target instanceof Element)) return;
        e.preventDefault(); e.stopImmediatePropagation();
        const colors = this.scanner.originalColors(e.target);
        this.$('property').replaceChildren(...colors.map(({ property, color }) => {
          const option = document.createElement('option'); option.value = P.Color.rgbToHex(color); option.textContent = `${property} — ${option.value}`; return option;
        }));
        if (colors.length) { this.select(P.Color.rgbToHex(colors[0].color)); this.$('property').focus(); }
      };
      this.key = e => { if (e.key === 'Escape') { e.preventDefault(); this.stop(); } else if (e.key === 'Enter' && !e.composedPath().includes(this.hostElement)) this.choose(e); };
      document.addEventListener('pointermove', this.hover, true); document.addEventListener('click', this.choose, true); document.addEventListener('keydown', this.key, true);
      this.$('property').onchange = () => this.select(this.$('property').value);
      this.$('cancel').onclick = () => this.stop();
      this.$('target').oninput = () => { this.$('hex').value = this.$('target').value.toUpperCase(); this.update(); };
      this.$('hex').oninput = () => { const c = P.Color.hexToRgb(this.$('hex').value); if (c) this.$('target').value = P.Color.rgbToHex(c); this.update(); };
      this.$('source').oninput = () => { this.selected = true; this.update(); };
      this.$('range').oninput = () => { this.$('value').value = this.$('range').value; this.update(); };
      this.$('preview').onclick = () => { this.previewing = true; this.$('box').style.display = 'none'; this.update(); };
      this.$('save').onclick = async () => {
        try {
          if (!this.update()) return;
          this.$('save').disabled = true;
          // Merge into latest saved profile so concurrent options edits are retained.
          const latest = await P.Storage.read();
          const profile = structuredClone(latest.profiles[this.host] || P.Model.profile(this.host));
          profile.rules.push(this.newRule);
          await P.Storage.request({ op: 'profile', host: this.host, profile }); this.stop();
        } catch (e) { this.$('notice').textContent = e.message; this.$('save').disabled = false; }
      };
      this.$('native').disabled = !('EyeDropper' in globalThis);
      this.$('native').onclick = async () => {
        this.abort = new AbortController();
        try {
          // Called directly from the page panel's click: preserves transient activation.
          const result = await new EyeDropper().open({ signal: this.abort.signal });
          this.select(result.sRGBHex); this.$('source').focus();
        } catch (e) { if (e.name !== 'AbortError') this.$('notice').textContent = 'Screen eyedropper unavailable. Click a page element instead.'; }
      };
      this.$('cancel').focus();
    }
    select(hex) { this.selected = true; this.$('source').value = hex; this.$('notice').textContent = `Detected ${hex}. Choose a replacement, then preview.`; this.update(); }
    update() {
      const source = this.$('source').value.trim(), target = this.$('hex').value.trim();
      const valid = this.selected && [source, target].every(v => /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(v));
      this.$('save').disabled = !valid;
      if (!valid) { this.$('notice').textContent = 'Select a color and enter valid #RGB or #RRGGBB values.'; return false; }
      Object.assign(this.newRule, { source: P.Color.rgbToHex(P.Color.hexToRgb(source)), target: P.Color.rgbToHex(P.Color.hexToRgb(target)), threshold: Number(this.$('range').value) });
      if (this.previewing) {
        try {
          const profile = structuredClone(this.profile); profile.rules.push(this.newRule); this.preview(profile);
          this.$('notice').textContent = this.state.settings.enabled && profile.enabled ? 'Live preview. Add rule & save to keep it.' : 'Rule ready. Global or site switch is OFF, so preview is inactive.';
        } catch (e) { this.$('notice').textContent = e.message; return false; }
      }
      return true;
    }
    stop(restore = true) {
      if (!this.hostElement) return;
      this.abort?.abort();
      document.removeEventListener('pointermove', this.hover, true); document.removeEventListener('click', this.choose, true); document.removeEventListener('keydown', this.key, true);
      this.hostElement.remove(); this.hostElement = null;
      if (restore) this.cancel(); this.previousFocus?.focus?.();
    }
  }
  P.PagePicker = PagePicker;
})();
