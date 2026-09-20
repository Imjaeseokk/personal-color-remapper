importScripts('../utils/constants.js', '../utils/color.js', '../utils/domain.js', '../utils/model.js', '../utils/storage.js');
const { C, Storage, Model, Domain } = PCR;
let writes = Promise.resolve();
let registrations = Promise.resolve();
async function registerSites() {
  const permissions = await chrome.permissions.getAll();
  const matches = (permissions.origins || []).filter(s => /^https?:\/\//.test(s));
  const registered = await chrome.scripting.getRegisteredContentScripts();
  const existing = registered.find(s => s.id === 'pcr-sites');
  if (!matches.length) { if (existing) await chrome.scripting.unregisterContentScripts({ ids: ['pcr-sites'] }); return; }
  const script = { id: 'pcr-sites', matches, js: C.SCRIPTS, runAt: 'document_idle', allFrames: false, persistAcrossSessions: true };
  if (existing) await chrome.scripting.updateContentScripts([script]);
  else await chrome.scripting.registerContentScripts([script]);
}
function syncSites() { registrations = registrations.catch(() => {}).then(registerSites); return registrations; }
chrome.runtime.onInstalled.addListener(() => { syncSites().catch(console.error); });
chrome.runtime.onStartup.addListener(() => { syncSites().catch(console.error); });
chrome.permissions.onAdded.addListener(() => { syncSites().catch(console.error); });
chrome.permissions.onRemoved.addListener(() => { syncSites().catch(console.error); });
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type === C.MSG.REGISTER) { syncSites().then(() => respond({ ok: true }), e => respond({ ok: false, error: e.message })); return true; }
  if (message.type !== C.MSG.WRITE) return;
  writes = writes.catch(() => {}).then(async () => {
    // Full replacement is only exposed to extension UI, never to a page content script.
    const extensionUI = sender.url?.startsWith(chrome.runtime.getURL(''));
    if (!extensionUI && (message.op !== 'profile' || message.host !== Domain.hostname(sender.url))) throw new Error('Invalid settings scope.');
    if (message.op === 'replace') return Storage.write(message.state);
    const state = await Storage.read();
    switch (message.op) {
      case 'enabled': state.settings.enabled = message.enabled; break;
      case 'profile':
        if (message.host === 'global') state.globalProfile = message.profile;
        else { if (!Domain.validHost(message.host)) throw new Error('Invalid hostname.'); state.profiles[message.host] = message.profile; }
        break;
      case 'delete': delete state.profiles[message.host]; break;
      default: throw new Error('Unknown settings operation.');
    }
    return Storage.write(Model.validate(state));
  });
  writes.then(state => respond({ ok: true, state }), e => respond({ ok: false, error: e.message }));
  return true;
});
