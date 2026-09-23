const { C, Model, Storage, Domain } = PCR;
const $ = id => document.getElementById(id);
let state, draft, selected = 'global', dirty = false;
const status = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
const editor = new PCR.RuleEditor($('rules'), () => { dirty = true; $('save').disabled = !editor.valid(); status(editor.valid() ? 'Unsaved edits. Save to apply to open pages.' : 'Fix invalid HEX values.', !editor.valid()); });
const discard = () => !dirty || confirm('Discard unsaved palette edits?');
function render() {
  $('profiles').replaceChildren(...['global', ...Object.keys(state.profiles).sort()].map(host => {
    const p = host === 'global' ? state.globalProfile : state.profiles[host];
    const option = document.createElement('option'); option.value = host; option.textContent = `${host === 'global' ? 'Global' : host} · ${p.rules.length} rules`; return option;
  }));
  if (selected !== 'global' && !state.profiles[selected]) selected = 'global';
  $('profiles').value = selected;
  draft = structuredClone(selected === 'global' ? state.globalProfile : state.profiles[selected]);
  $('enabled').checked = state.settings.enabled; $('name').value = draft.name; $('profile-enabled').checked = draft.enabled;
  $('scope').textContent = selected === 'global' ? 'Global palette' : selected;
  $('delete').disabled = selected === 'global'; editor.set(draft.rules, selected); $('save').disabled = false; dirty = false;
}
function changed() { draft.name = $('name').value; draft.enabled = $('profile-enabled').checked; dirty = true; status('Unsaved edits. Save to apply to open pages.'); }
async function permissions() {
  const { origins = [] } = await chrome.permissions.getAll();
  $('permissions').textContent = origins.length ? `Granted: ${origins.join(', ')}` : 'No automatic site access granted.';
}
async function register() { const r = await chrome.runtime.sendMessage({ type: C.MSG.REGISTER }); if (!r?.ok) throw new Error(r?.error || 'Could not update site registration.'); await permissions(); }
function action(id, fn) { $(id).onclick = async () => { try { await fn(); } catch (e) { status(e.message, true); } }; }
$('profiles').onchange = () => { if (!discard()) { $('profiles').value = selected; return; } selected = $('profiles').value; render(); status(''); };
$('name').oninput = changed; $('profile-enabled').onchange = changed;
$('enabled').onchange = async () => { try { state = await Storage.request({ op: 'enabled', enabled: $('enabled').checked }); status('Extension switch saved.'); } catch (e) { $('enabled').checked = state.settings.enabled; status(e.message, true); } };
action('add', () => editor.add());
action('save', async () => {
  if (!editor.valid()) throw new Error('Fix invalid HEX values.');
  if (selected !== 'global') {
    if (!await chrome.permissions.request({ origins: Domain.origins(selected) })) throw new Error('Site permission declined. Your edits are still here.');
    await register();
  }
  state = await Storage.request({ op: 'profile', host: selected, profile: draft }); render(); status('Palette saved. Applied to connected pages. Reload an already-open site if access was just granted.');
});
action('cancel', async () => { state = await Storage.read(); render(); status('Edits discarded.'); });
action('create', async () => {
  const host = $('new-domain').value.trim().toLowerCase();
  if (!Domain.validHost(host)) throw new Error('Enter a hostname only, for example github.com.');
  if (state.profiles[host]) throw new Error('That domain already has a profile.');
  if (!discard()) return;
  state = await Storage.request({ op: 'profile', host, profile: Model.profile(host) }); selected = host; render(); $('new-domain').value = ''; status('Profile created. Save to grant automatic access.');
});
action('duplicate', async () => {
  if (!editor.valid()) throw new Error('Fix invalid HEX values first.');
  const answer = prompt('Copy this palette to which hostname?'); if (answer === null) return;
  const host = answer.trim().toLowerCase(); if (!Domain.validHost(host)) throw new Error('Invalid hostname.');
  if (state.profiles[host] && !confirm(`Replace the existing profile for ${host}?`)) return;
  const copy = structuredClone(draft); copy.name = `${draft.name.slice(0, 93)} (copy)`; copy.rules.forEach(r => r.id = crypto.randomUUID());
  state = await Storage.request({ op: 'profile', host, profile: copy }); selected = host; render(); status('Copied. Save to grant automatic access to this site.');
});
action('delete', async () => { if (selected === 'global' || !confirm(`Delete ${selected}? Global rules will apply again on this site.`)) return; state = await Storage.request({ op: 'delete', host: selected }); selected = 'global'; render(); status('Profile deleted.'); });
action('export', async () => {
  const current = await Storage.read(); const url = URL.createObjectURL(new Blob([Model.exportJSON(current)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'personal-color-remapper.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); status('Exported saved settings. Unsaved edits are not included.');
});
$('import').onchange = async () => {
  try {
    const file = $('import').files[0]; if (!file) return;
    if (file.size > C.MAX_IMPORT_BYTES) throw new Error('Import must be smaller than 2 MB.');
    const imported = Model.importJSON(await file.text());
    if (!confirm(`Replace all settings with ${Object.keys(imported.profiles).length} domain profiles and the imported global palette? Unsaved edits will be discarded.`)) return;
    state = await Storage.request({ op: 'replace', state: imported }); selected = 'global'; render(); status('Imported. Save each domain or grant site access below to enable automatic application.');
  } catch (e) { status(e.message, true); } finally { $('import').value = ''; }
};
action('reset', async () => { if (!confirm('Delete ALL saved profiles and rules? Export a backup first if needed.')) return; state = await Storage.request({ op: 'replace', state: Model.defaults() }); selected = 'global'; render(); status('Settings reset. Site access can be revoked separately below.'); });
action('grant-all', async () => { if (!await chrome.permissions.request({ origins: ['http://*/*', 'https://*/*'] })) throw new Error('Permission declined.'); await register(); status('All website access granted. Reload already-open pages once.'); });
action('revoke-all', async () => {
  const { origins = [] } = await chrome.permissions.getAll();
  if (origins.length) await chrome.permissions.remove({ origins }); await register();
  status('Automatic access revoked. Reload open pages to remove any existing content script.');
});
(async () => { try { state = await Storage.read(); render(); await permissions(); } catch (e) { state = Model.defaults(); render(); status(`${e.message} Use Import or Reset to recover stored settings.`, true); } })();
