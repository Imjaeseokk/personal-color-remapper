import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const unpacked = path.join(dist, 'chrome-unpacked');
// Explicit runtime allowlist: never include tests, developer dependencies or store drafts.
const runtime = [
  'manifest.json',
  ...[16, 32, 48, 128].map(n => 'icons/icon-' + n + '.png'),
  'background/service-worker.js',
  ...['content', 'color-engine', 'dom-scanner', 'picker'].map(n => 'content/' + n + '.js'),
  ...['popup', 'options'].flatMap(n => ['html', 'css', 'js'].map(ext => n + '/' + n + '.' + ext)),
  'guide/guide.html', 'guide/guide.css',
  'privacy.html',
  'ui/shared.css', 'ui/rule-editor.js',
  ...['constants', 'color', 'domain', 'model', 'storage'].map(n => 'utils/' + n + '.js')
].sort();
const entries = await Promise.all(runtime.map(async name => ({ name, data: await readFile(path.join(root, name)) })));
const manifest = JSON.parse(entries.find(e => e.name === 'manifest.json').data);
assert.equal(manifest.manifest_version, 3);
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.deepEqual(manifest.permissions, ['storage', 'activeTab', 'scripting']);
assert.equal(manifest.host_permissions, undefined, 'Do not package fixture host permissions.');
for (const file of [manifest.action.default_popup, manifest.options_page, manifest.background.service_worker, ...Object.values(manifest.icons)]) assert.ok(runtime.includes(file), 'Missing ' + file);
for (const entry of entries.filter(e => e.name.endsWith('.html'))) {
  for (const match of entry.data.toString().matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (match[1].startsWith('#')) continue;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(entry.name), match[1]));
    assert.ok(runtime.includes(resolved), 'Missing or remote UI dependency: ' + resolved);
  }
}
function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) { c ^= b; for (let i=0;i<8;i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return (c ^ 0xffffffff) >>> 0; }
// Small uncompressed ZIP: portable, deterministic, no archiver runtime dependency.
const local = [], central = []; let offset = 0;
for (const { name, data } of entries) {
  const filename = Buffer.from(name), crc = crc32(data);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6);
  header.writeUInt16LE(33, 12); header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(filename.length, 26);
  local.push(header, filename, data);
  const directory = Buffer.alloc(46);
  directory.writeUInt32LE(0x02014b50); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6);
  directory.writeUInt16LE(0x800, 8); directory.writeUInt16LE(33, 14);
  directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(data.length, 20); directory.writeUInt32LE(data.length, 24);
  directory.writeUInt16LE(filename.length, 28); directory.writeUInt32LE(offset, 42);
  central.push(directory, filename); offset += header.length + filename.length + data.length;
}
const directory = Buffer.concat(central), end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...local, directory, end]);
await mkdir(dist, { recursive: true });
// Only replace the known generated runtime directory, after resolving its boundary.
assert.equal(path.dirname(path.resolve(unpacked)), path.resolve(dist));
assert.equal(path.basename(unpacked), 'chrome-unpacked');
await rm(unpacked, { recursive: true, force: true });
await mkdir(unpacked);
for (const { name, data } of entries) {
  await mkdir(path.dirname(path.join(unpacked, name)), { recursive: true });
  await writeFile(path.join(unpacked, name), data);
}
const archive = 'personal-color-remapper-' + manifest.version + '-chrome.zip';
await writeFile(path.join(dist, archive), zip);
const sha256 = data => createHash('sha256').update(data).digest('hex');
await writeFile(path.join(dist, 'BUILD-INFO.json'), JSON.stringify({
  version: manifest.version, archive, sha256: sha256(zip), bytes: zip.length,
  files: entries.map(e => ({ path: e.name, bytes: e.data.length, sha256: sha256(e.data) }))
}, null, 2) + '\n');
console.log('Runtime: ' + unpacked + '\nUpload ZIP: ' + path.join(dist, archive) + '\nVerified ' + entries.length + ' runtime files; SHA256 ' + sha256(zip));
