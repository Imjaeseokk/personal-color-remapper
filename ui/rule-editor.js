(() => {
  const { Color, Model, C } = PCR;
  PCR.RuleEditor = class {
    constructor(container, onChange) { this.container = container; this.onChange = onChange; }
    set(rules) { this.rules = rules; this.render(); }
    valid() { return !this.container.querySelector('[aria-invalid="true"]'); }
    add(source) { if (this.rules.length >= C.MAX_RULES) throw new Error(`Maximum ${C.MAX_RULES} rules.`); this.rules.push(Model.rule(source)); this.render(); this.onChange(); this.container.lastElementChild?.querySelector('input')?.focus(); }
    render() {
      this.container.replaceChildren();
      if (!this.rules.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Choose a difficult color, then a replacement you can distinguish.'; this.container.append(p); }
      this.rules.forEach((rule, index) => {
        const fieldset = document.createElement('fieldset'); fieldset.className = 'rule';
        const legend = document.createElement('legend'); legend.textContent = `Rule ${index + 1}`; fieldset.append(legend);
        const toggle = document.createElement('label'); toggle.className = 'toggle';
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = rule.enabled;
        checkbox.onchange = () => { rule.enabled = checkbox.checked; this.onChange(); };
        toggle.append(checkbox, 'Rule enabled'); fieldset.append(toggle);
        const fields = document.createElement('div'); fields.className = 'color-fields';
        for (const [key, title] of [['source', 'Source'], ['target', 'Target']]) {
          const label = document.createElement('div'); label.className = 'color-field';
          const span = document.createElement('span'); span.textContent = title;
          const row = document.createElement('div'); row.className = 'row';
          const color = document.createElement('input'); color.type = 'color'; color.value = rule[key]; color.setAttribute('aria-label', `Rule ${index + 1} ${title} color`);
          const hex = document.createElement('input'); hex.type = 'text'; hex.className = 'hex'; hex.value = rule[key]; hex.maxLength = 7; hex.spellcheck = false; hex.setAttribute('aria-label', `Rule ${index + 1} ${title} HEX`);
          const error = document.createElement('small'); error.className = 'error'; error.id = `error-${rule.id}-${key}`; error.setAttribute('aria-live', 'polite'); hex.setAttribute('aria-describedby', error.id);
          color.oninput = () => { rule[key] = color.value.toUpperCase(); hex.value = rule[key]; hex.removeAttribute('aria-invalid'); error.textContent = ''; this.onChange(); };
          hex.oninput = () => {
            const valid = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex.value.trim());
            hex.setAttribute('aria-invalid', String(!valid)); error.textContent = valid ? '' : 'Use #RGB or #RRGGBB';
            if (valid) { rule[key] = Color.rgbToHex(Color.hexToRgb(hex.value.trim())); color.value = rule[key]; }
            this.onChange();
          };
          row.append(color, hex); label.append(span, row, error); fields.append(label);
        }
        fieldset.append(fields);
        const label = document.createElement('label'); const text = document.createElement('span'); text.className = 'threshold-label';
        const output = document.createElement('output'); output.value = rule.threshold;
        text.append('Similarity', output);
        const range = document.createElement('input'); range.type = 'range'; range.min = C.THRESHOLD_MIN; range.max = C.THRESHOLD_MAX; range.step = 1; range.value = rule.threshold;
        range.setAttribute('aria-label', `Rule ${index + 1} similarity`);
        range.oninput = () => { rule.threshold = Number(range.value); output.value = range.value; this.onChange(); };
        label.append(text, range); fieldset.append(label);
        const actions = document.createElement('div'); actions.className = 'rule-actions';
        for (const [title, offset] of [['Move up', -1], ['Move down', 1]]) {
          const button = document.createElement('button'); button.textContent = title; button.type = 'button'; button.disabled = index + offset < 0 || index + offset >= this.rules.length;
          button.onclick = () => { const other = index + offset; [this.rules[index], this.rules[other]] = [this.rules[other], this.rules[index]]; this.render(); this.onChange(); }; actions.append(button);
        }
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.textContent = 'Delete'; remove.setAttribute('aria-label', `Delete rule ${index + 1}`);
        remove.onclick = () => { this.rules.splice(index, 1); this.render(); this.onChange(); this.container.querySelector('input')?.focus(); }; actions.append(remove); fieldset.append(actions);
        this.container.append(fieldset);
      });
    }
  };
})();
