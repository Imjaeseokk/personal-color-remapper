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
  P.Color = { hexToRgb, rgbToHex, parseCss, toOklab, distance, css, browserParser };
})();
