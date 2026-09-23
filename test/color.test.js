import test from 'node:test';
import assert from 'node:assert/strict';
import '../utils/constants.js';
import '../utils/color.js';
import '../utils/domain.js';
import '../utils/model.js';
import '../content/color-engine.js';
const { Color, Model, Domain, ColorEngine } = globalThis.PCR;
const red = { r: 255, g: 0, b: 0, a: 1 };
test('HEX short, full, case, alpha and round trip', () => {
  for (const value of ['#f00', '#F00', '#ff0000', '#FF0000']) assert.deepEqual(Color.hexToRgb(value), red);
  assert.equal(Color.hexToRgb('#f008').a, 136 / 255);
  assert.equal(Color.hexToRgb('#ff000080').a, 128 / 255);
  assert.equal(Color.rgbToHex(red), '#FF0000');
});
test('CSS named, RGB and modern RGB normalize to the same color', () => {
  for (const value of ['red', 'rgb(255, 0, 0)', 'rgb(255 0 0)', 'rgb(100% 0% 0%)', 'rgba(255,0,0,1)']) {
    const parsed = Color.parseCss(value); assert.equal(Color.rgbToHex(parsed), '#FF0000'); assert.equal(parsed.a, 1);
  }
  for (const value of ['rgba(255,0,0,.5)', 'rgb(255 0 0 / 50%)']) assert.equal(Color.parseCss(value).a, .5);
});
test('Malformed syntax and unsupported values safely return null', () => {
  for (const value of [null, {}, '', '#ff', '#fgg', '#fffff', 'rgb(2,3)', 'rgb(1 2 3 .5)', 'rgb(1,2,3 / .5)', 'rgb(NaN,2,3)', 'url(x)', 'var(--color)', 'none']) assert.equal(Color.parseCss(value), null, String(value));
});
test('OKLab reference values and distance scale', () => {
  const lab = Color.toOklab(red);
  const expected = [.6279553606, .2248630611, .1258462985];
  lab.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-8));
  assert.equal(Color.distance(lab, lab), 0);
  assert.ok(Math.abs(Color.distance(Color.toOklab(Color.hexToRgb('#000')), Color.toOklab(Color.hexToRgb('#fff'))) - 100) < 1e-5);
});
test('OKLCH target recommendation preserves lightness and chroma when in gamut', () => {
  const suggestion = Color.recommendTarget('#28A745');
  assert.equal(suggestion.hex, '#707EF4'); assert.equal(suggestion.exactChroma, true);
  const source = Color.toOklch(Color.hexToRgb('#28A745')); const target = Color.toOklch(Color.hexToRgb(suggestion.hex));
  assert.ok(Math.abs(source[0] - target[0]) < .003); assert.ok(Math.abs(source[1] - target[1]) < .003);
});
test('Red and green page colors are surfaced as simulated confusion candidates', () => {
  const suggestions = Color.confusionCandidates([{ hex: '#FF0000', count: 10 }, { hex: '#008000', count: 8 }, { hex: '#0000FF', count: 3 }]);
  assert.equal(suggestions[0].hex, '#FF0000'); assert.equal(suggestions[0].mate, '#008000');
  assert.ok(suggestions[0].simulated < suggestions[0].normal);
});
test('Rule names migrate safely and defaults use order plus hostname', () => {
  const state = Model.defaults(); const legacy = Model.rule('#FF0000'); delete legacy.name; delete legacy.customName;
  state.profiles['github.com'] = { ...Model.profile('GitHub'), rules: [legacy, Model.rule('#00FF00')] };
  const valid = Model.validate(state);
  assert.equal(valid.profiles['github.com'].rules[0].name, 'rule_1_github.com');
  assert.equal(valid.profiles['github.com'].rules[1].name, 'rule_2_github.com');
  assert.equal(valid.profiles['github.com'].rules[0].customName, false);
  valid.profiles['github.com'].rules[0].name = 'Status red'; valid.profiles['github.com'].rules[0].customName = true;
  assert.equal(Model.validate(valid).profiles['github.com'].rules[0].name, 'Status red');
});
test('Threshold expands perceptual match and target alpha stays original', () => {
  const engine = new ColorEngine(); const rule = { ...Model.rule('#FF0000'), threshold: 0 };
  engine.setRules([rule]); assert.equal(engine.transform('#F50000'), null);
  engine.setRules([{ ...rule, threshold: 5 }]); assert.equal(engine.transform('#F50000'), 'rgba(41, 121, 255, 1)');
  assert.equal(engine.transform('rgba(255,0,0,.5)'), 'rgba(41, 121, 255, 0.5)');
  assert.equal(engine.transform('rgba(255,0,0,0)'), null);
});
test('Rules never chain and first match wins', () => {
  const engine = new ColorEngine();
  engine.setRules([{ ...Model.rule('#FF0000'), target: '#0000FF', threshold: 0 }, { ...Model.rule('#0000FF'), target: '#800080', threshold: 0 }]);
  assert.equal(engine.transform('red'), 'rgba(0, 0, 255, 1)');
  assert.equal(engine.transform('blue'), 'rgba(128, 0, 128, 1)');
  engine.setRules([{ ...Model.rule('#FF0000'), target: '#00FF00', enabled: false }, { ...Model.rule('#FF0000'), threshold: 0 }]);
  assert.equal(engine.transform('red'), 'rgba(41, 121, 255, 1)');
});
test('Domain precedence, global fallback, explicit site OFF and master OFF', () => {
  const state = Model.defaults(); state.globalProfile.enabled = true; state.globalProfile.rules = [Model.rule('#FF0000')];
  state.profiles['github.com'] = { ...Model.profile(), rules: [Model.rule('#FF0000')] };
  assert.equal(Model.effective(state, 'github.com')[0], state.profiles['github.com'].rules[0]);
  assert.equal(Model.effective(state, 'other.com')[0], state.globalProfile.rules[0]);
  state.profiles['github.com'].enabled = false; assert.deepEqual(Model.effective(state, 'github.com'), []);
  state.settings.enabled = false; assert.deepEqual(Model.effective(state, 'other.com'), []);
});
test('Domain normalization and dangerous/malformed keys', () => {
  assert.equal(Domain.hostname('https://GitHub.com/foo'), 'github.com');
  assert.equal(Domain.hostname('chrome://extensions'), null);
  for (const host of ['__proto__', 'constructor', 'prototype', 'example.com/a', '*.github.com', 'host:123', 'user@host', '']) assert.equal(Domain.validHost(host), false, host);
  for (const host of ['github.com', 'localhost', '127.0.0.1', '[::1]']) assert.equal(Domain.validHost(host), true, host);
});
test('Export/import roundtrip, schema and validation failures are isolated', () => {
  const state = Model.defaults(); state.profiles['github.com'] = { ...Model.profile('GitHub'), rules: [Model.rule()] };
  assert.deepEqual(Model.importJSON(Model.exportJSON(state)), Model.validate(state));
  assert.throws(() => Model.importJSON('{'));
  assert.throws(() => Model.importJSON('{"schemaVersion":2}'));
  const invalid = structuredClone(state); invalid.profiles['github.com'].rules[0].threshold = -1;
  assert.throws(() => Model.validate(invalid));
  invalid.profiles['github.com'].rules[0].threshold = 10; invalid.profiles['github.com'].rules[0].source = '#f008';
  assert.throws(() => Model.validate(invalid));
  const duplicate = structuredClone(state); duplicate.profiles['github.com'].rules.push(duplicate.profiles['github.com'].rules[0]); assert.throws(() => Model.validate(duplicate));
  const poison = JSON.parse(JSON.stringify(state)); Object.defineProperty(poison.profiles, '__proto__', { enumerable: true, value: Model.profile() }); assert.throws(() => Model.validate(poison));
  assert.equal(state.profiles['github.com'].rules[0].threshold, 15);
});
test('Rule update invalidates result cache', () => {
  const engine = new ColorEngine(); const rule = Model.rule('#FF0000');
  engine.setRules([rule]); assert.equal(engine.transform('red'), 'rgba(41, 121, 255, 1)');
  engine.setRules([{ ...rule, target: '#123456' }]); assert.equal(engine.transform('red'), 'rgba(18, 52, 86, 1)');
  engine.setRules([]); assert.equal(engine.transform('red'), null);
});
