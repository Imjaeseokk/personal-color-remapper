(() => {
  const P = globalThis.PCR ||= {};
  const clamp = (n, max = 1) => Math.min(max, Math.max(0, n));
  function hexToRgb(value) {
    if (typeof value !== 'string' || !/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) return null;
    let s = value.slice(1);
    if (s.length < 5) s = [...s].map(c => c + c).join('');
    return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16), a: s.length === 8 ? parseInt(s.slice(6), 16) / 255 : 1 };
  }
  function rgbToHex({ r, g, b }) {
    return '#' + [r, g, b].map(n => Math.round(clamp(n, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  const number = /^[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?%?$/i;
  function parseCss(value) {
    if (typeof value !== 'string') return null;
    const s = value.trim().toLowerCase();
    if (s.startsWith('#')) return hexToRgb(s);
    const named = { red: '#ff0000', green: '#008000', blue: '#0000ff', white: '#ffffff', black: '#000000', transparent: '#00000000' };
    if (named[s]) return hexToRgb(named[s]);
    const match = /^rgba?\((.*)\)$/.exec(s);
    if (!match) return null;
    const body = match[1].trim();
    if (body.includes(',') && body.includes('/')) return null;
    const parts = body.includes(',') ? body.split(',').map(v => v.trim()) : body.replace('/', ' / ').split(/\s+/);
    if (parts.includes('/')) {
      if (parts.length !== 5 || parts[3] !== '/') return null;
      parts.splice(3, 1);
    } else if (!body.includes(',') && parts.length !== 3) return null;
    if (![3, 4].includes(parts.length) || !parts.every(v => number.test(v) && Number.isFinite(parseFloat(v)))) return null;
    const channel = v => clamp(parseFloat(v) * (v.endsWith('%') ? 2.55 : 1), 255);
    const alpha = parts[3] === undefined ? 1 : clamp(parseFloat(parts[3]) / (parts[3].endsWith('%') ? 100 : 1));
    return { r: channel(parts[0]), g: channel(parts[1]), b: channel(parts[2]), a: alpha };
  }
  function toOklab({ r, g, b }) {
    const linear = v => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    r = linear(r); g = linear(g); b = linear(b);
    const l = Math.cbrt(0.4122214708*r + 0.5363325363*g + 0.0514459929*b);
    const m = Math.cbrt(0.2119034982*r + 0.6806995451*g + 0.1073969566*b);
    const s = Math.cbrt(0.0883024619*r + 0.2817188376*g + 0.6299787005*b);
    return [0.2104542553*l + 0.793617785*m - 0.0040720468*s,
      1.9779984951*l - 2.428592205*m + 0.4505937099*s,
      0.0259040371*l + 0.7827717662*m - 0.808675766*s];
  }
  function fromOklab([L, a, b]) {
    const l = (L + 0.3963377774*a + 0.2158037573*b) ** 3;
    const m = (L - 0.1055613458*a - 0.0638541728*b) ** 3;
    const s = (L - 0.0894841775*a - 1.291485548*b) ** 3;
    const linear = [
      4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
      -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
      -0.0041960863*l - 0.7034186147*m + 1.707614701*s
    ];
    const srgb = v => 255 * (v <= 0.0031308 ? 12.92*v : 1.055*Math.pow(v, 1/2.4) - 0.055);
    return { r: srgb(linear[0]), g: srgb(linear[1]), b: srgb(linear[2]), a: 1 };
  }
  const toOklch = rgb => { const [L, a, b] = toOklab(rgb); return [L, Math.hypot(a, b), (Math.atan2(b, a) * 180 / Math.PI + 360) % 360]; };
  const fromOklch = ([L, C, h]) => { const rad = h * Math.PI / 180; return fromOklab([L, C*Math.cos(rad), C*Math.sin(rad)]); };
  const inGamut = rgb => [rgb.r, rgb.g, rgb.b].every(v => Number.isFinite(v) && v >= -0.001 && v <= 255.001);
  function simulate(rgb, type) {
    const linearize = v => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    const encode = v => 255 * (v <= 0.0031308 ? 12.92*v : 1.055*Math.pow(Math.max(0, v), 1/2.4) - 0.055);
    const v = [linearize(rgb.r), linearize(rgb.g), linearize(rgb.b)];
    const matrices = {
      protan: [[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
      deutan: [[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]]
    };
    const out = matrices[type].map(row => row.reduce((sum, n, i) => sum + n*v[i], 0));
    return { r: clamp(encode(out[0]), 255), g: clamp(encode(out[1]), 255), b: clamp(encode(out[2]), 255), a: rgb.a ?? 1 };
  }
  function confusionCandidates(entries, limit = 8) {
    const colors = entries.map(entry => ({ ...entry, rgb: hexToRgb(entry.hex) })).filter(x => x.rgb);
    const pairs = [];
    for (let i = 0; i < colors.length; i++) for (let j = i + 1; j < colors.length; j++) {
      const normal = distance(toOklab(colors[i].rgb), toOklab(colors[j].rgb));
      if (normal < 6) continue;
      for (const type of ['protan', 'deutan']) {
        const simulated = distance(toOklab(simulate(colors[i].rgb, type)), toOklab(simulate(colors[j].rgb, type)));
        const collapse = normal - simulated;
        if (simulated <= 14 && collapse >= 3 && simulated / normal <= 0.72) {
          const score = collapse * (1 + Math.log2(1 + Math.min(colors[i].count, colors[j].count)) / 4);
          pairs.push({ a: colors[i], b: colors[j], type, normal, simulated, score });
        }
      }
    }
    pairs.sort((a, b) => b.score - a.score);
    const result = [], seen = new Set();
    for (const pair of pairs) {
      for (const [color, mate] of [[pair.a, pair.b], [pair.b, pair.a]]) {
        if (seen.has(color.hex)) continue;
        seen.add(color.hex); result.push({ hex: color.hex, count: color.count, mate: mate.hex, type: pair.type,
          normal: Number(pair.normal.toFixed(1)), simulated: Number(pair.simulated.toFixed(1)) });
        if (result.length >= limit) return result;
      }
    }
    return result;
  }
  function recommendTarget(source, avoid = []) {
    const rgb = typeof source === 'string' ? hexToRgb(source) : source;
    if (!rgb) return null;
    const [L, originalC] = toOklch(rgb);
    const avoidRgb = avoid.map(value => typeof value === 'string' ? hexToRgb(value) : value).filter(Boolean);
    const hues = [255, 275, 295, 230, 315, 210, 330, 195];
    const candidates = [];
    for (const hue of hues) {
      let C = originalC, candidate = fromOklch([L, C, hue]);
      while (!inGamut(candidate) && C > 0.005) { C *= 0.97; candidate = fromOklch([L, C, hue]); }
      if (!inGamut(candidate)) continue;
      const distances = ['protan', 'deutan'].flatMap(type => {
        const transformed = simulate(candidate, type);
        return [distance(toOklab(transformed), toOklab(simulate(rgb, type))),
          ...avoidRgb.map(other => distance(toOklab(transformed), toOklab(simulate(other, type))))];
      });
      candidates.push({ rgb: candidate, hue, chroma: C, score: Math.min(...distances) });
    }
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    return best && { hex: rgbToHex(best.rgb), lightness: L, sourceChroma: originalC, targetChroma: best.chroma,
      exactChroma: Math.abs(best.chroma - originalC) < 0.001, hue: best.hue };
  }
  const distance = (a, b) => 100 * Math.hypot(...a.map((v, i) => v - b[i]));
  const css = ({ r, g, b, a = 1 }) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Number(a.toFixed(5))})`;
  // Browser adapter for named colors, hsl(), lab(), oklch(), color(), etc.
  // A one-pixel canvas is used only for color normalization, never page/image processing.
  function browserParser() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    return value => {
      const parsed = parseCss(value);
      if (parsed) return parsed;
      if (!ctx || typeof value !== 'string' || /currentcolor|var\(|url\(|inherit|initial|unset|revert/i.test(value) || !CSS.supports('color', value)) return null;
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return { r, g, b, a: a / 255 };
    };
  }
  P.Color = { hexToRgb, rgbToHex, parseCss, toOklab, fromOklab, toOklch, fromOklch, distance, css,
    simulate, confusionCandidates, recommendTarget, browserParser };
})();
