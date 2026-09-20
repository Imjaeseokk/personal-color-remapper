(() => {
  const P = globalThis.PCR;
  if (P.controller) return; // activeTab injection and persistent registration may overlap.
  const { C, Model, Storage, Domain } = P;
  const host = Domain.hostname(location.href);
  const scanner = new P.DomScanner(new P.ColorEngine(P.Color.browserParser()));
  let state = Model.defaults(); let preview = null; let previewOwner = null; let picker = null;
  const apply = () => scanner.setRules(Model.effective(preview || state, host));
  async function refresh() {
    try { state = await Storage.read(); } catch (e) { state = Model.defaults(); console.warn('Personal Color Remapper:', e.message); }
    preview = null; previewOwner = null; picker?.stop(false); picker = null; apply();
  }
  P.controller = { scanner };
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes[C.KEY]) refresh(); });
  chrome.runtime.onConnect.addListener(port => {
    if (port.name !== C.PORT) return;
    port.onMessage.addListener(message => {
      try {
        if (message.type === C.MSG.PREVIEW) {
          const next = structuredClone(state); next.profiles[host] = message.profile;
          preview = Model.validate(next); previewOwner = port; apply();
        }
        if (message.type === C.MSG.RESET && previewOwner === port) { preview = null; previewOwner = null; apply(); }
      } catch (e) { port.postMessage({ error: e.message }); }
    });
    port.onDisconnect.addListener(() => { if (previewOwner === port) { preview = null; previewOwner = null; apply(); } });
  });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.type === C.MSG.GET) { respond({ ok: true, host, stats: scanner.getStats() }); return; }
    if (message.type === C.MSG.REFRESH) { refresh().then(() => respond({ ok: true })); return true; }
    if (message.type === C.MSG.STOP_PICK) { picker?.stop(); respond({ ok: true }); return; }
    if (message.type === C.MSG.PICK) {
      picker?.stop(); preview = null; previewOwner = null; apply();
      picker = new P.PagePicker({ scanner, host, state: structuredClone(state),
        preview: profile => { const next = structuredClone(state); next.profiles[host] = profile; preview = Model.validate(next); previewOwner = 'picker'; apply(); },
        cancel: () => { preview = null; previewOwner = null; apply(); } });
      picker.start(); respond({ ok: true });
    }
  });
  refresh();
})();
