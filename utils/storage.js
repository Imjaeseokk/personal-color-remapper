(() => {
  const P = globalThis.PCR ||= {};
  // This is the only storage-area selection. A sync migration can change this adapter.
  const area = () => chrome.storage.local;
  async function read() {
    const raw = (await area().get(P.C.KEY))[P.C.KEY];
    return raw === undefined ? P.Model.defaults() : P.Model.validate(raw);
  }
  async function write(state) { const valid = P.Model.validate(state); await area().set({ [P.C.KEY]: valid }); return valid; }
  async function request(operation) {
    const result = await chrome.runtime.sendMessage({ type: P.C.MSG.WRITE, ...operation });
    if (!result?.ok) throw new Error(result?.error || 'Could not save settings.');
    return result.state;
  }
  P.Storage = { read, write, request };
})();
