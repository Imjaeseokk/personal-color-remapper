const { C, Model, Storage, Domain } = PCR;
const $ = id => document.getElementById(id);
let state, draft, tab, host, port, dirty = false, previewTimer;
const status = (text, error = false) => { $('status').textContent = text; $('status').classList.toggle('error', error); };
const editor = new PCR.RuleEditor($('rules'), changed);
function changed() {
  dirty = true; $('save').disabled = !editor.valid();
  clearTimeout(previewTimer);
  if (!editor.valid()) { status('Fix invalid HEX values before saving.', true); return; }
  draft.name = $('name').value; draft.enabled = $('site-enabled').checked;
  previewTimer = setTimeout(() => {
    try { port.postMessage({ type: C.MSG.PREVIEW, profile: draft }); status(state.settings.enabled && draft.enabled ? 'Live preview · not saved' : 'Edits ready · color replacement is switched OFF'); }
    catch { status('Page connection lost. Reopen the popup after reloading the tab.', true); }
  }, C.MUTATION_DELAY);
}
function render() {
  draft = structuredClone(state.profiles[host] || Model.profile(host));
  $('enabled').checked = state.settings.enabled; $('enabled').nextSibling.textContent = state.settings.enabled ? 'ON' : 'OFF'; $('site-enabled').checked = draft.enabled; $('name').value = draft.name;
  $('global-info').textContent = state.globalProfile.enabled ? `${state.globalProfile.rules.filter(r => r.enabled).length} global rules also apply after site rules.` : 'Global palette is OFF.';
  editor.set(draft.rules); dirty = false;
}
async function ensureContent() {
  try { await chrome.tabs.sendMessage(tab.id, { type: C.MSG.GET }); }
  catch { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: C.SCRIPTS }); }
  port = chrome.tabs.connect(tab.id, { name: C.PORT });
  port.onMessage.addListener(msg => { if (msg.error) status(msg.error, true); });
  port.onDisconnect.addListener(() => { const error = chrome.runtime.lastError; status(error?.message || 'Page disconnected. Reopen this popup.', true); $('save').disabled = true; });
}
async function sitePermission() {
  const granted = await chrome.permissions.request({ origins: Domain.origins(host) });
  if (!granted) throw new Error('Site access was declined. Preview still works; allow access to save and apply automatically.');
  const result = await chrome.runtime.sendMessage({ type: C.MSG.REGISTER });
  if (!result?.ok) throw new Error(result?.error || 'Could not register site access.');
}
$('options').onclick = () => chrome.runtime.openOptionsPage();
$('add').onclick = () => { try { editor.add(); } catch (e) { status(e.message, true); } };
$('name').oninput = changed; $('site-enabled').onchange = changed;
$('enabled').onchange = async () => {
  try { clearTimeout(previewTimer); state = await Storage.request({ op: 'enabled', enabled: $('enabled').checked }); $('enabled').nextSibling.textContent = state.settings.enabled ? 'ON' : 'OFF'; status('Extension ' + (state.settings.enabled ? 'ON' : 'OFF') + ' · saved'); if (dirty) { await chrome.tabs.sendMessage(tab.id, { type: C.MSG.REFRESH }); changed(); } }
  catch (e) { $('enabled').checked = state.settings.enabled; status(e.message, true); }
};
$('save').onclick = async () => {
  try {
    if (!editor.valid()) return;
    await sitePermission(); clearTimeout(previewTimer);
    $('save').disabled = true;
    state = await Storage.request({ op: 'profile', host, profile: draft });
    port.postMessage({ type: C.MSG.RESET }); render(); status(`Saved for ${host}. Automatic on your next visit.`);
  } catch (e) { status(e.message, true); }
  finally { $('save').disabled = !editor.valid(); }
};
$('cancel').onclick = async () => { try { clearTimeout(previewTimer); port.postMessage({ type: C.MSG.RESET }); state = await Storage.read(); render(); status('Unsaved edits discarded.'); } catch (e) { status(e.message, true); } };
$('pick').onclick = async () => {
  try {
    if (dirty && !confirm('Discard unsaved popup edits and pick a color from the page?')) return;
    await sitePermission(); clearTimeout(previewTimer); port.postMessage({ type: C.MSG.RESET });
    await chrome.tabs.sendMessage(tab.id, { type: C.MSG.PICK }); window.close();
  } catch (e) { status(e.message, true); }
};
(async () => {
  try {
    state = await Storage.read(); $('enabled').checked = state.settings.enabled; $('enabled').nextSibling.textContent = state.settings.enabled ? 'ON' : 'OFF'; $('enabled').disabled = false;
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); host = Domain.hostname(tab?.url);
    if (!host) throw new Error('Open a regular HTTP or HTTPS page. Chrome settings, Web Store and file pages cannot be remapped.');
    $('domain').textContent = host; await ensureContent(); render();
    for (const id of ['site-enabled', 'name', 'add', 'pick', 'save', 'cancel']) $(id).disabled = false;
    status('Ready. Changes stay local to your browser.');
  } catch (e) { $('domain').textContent = host || 'Unavailable page'; status(e.message, true); }
})();
