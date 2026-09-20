(() => {
  const P = globalThis.PCR ||= {};
  const hostname = url => { try { const u = new URL(url); return /^https?:$/.test(u.protocol) ? u.hostname.toLowerCase() : null; } catch { return null; } };
  function validHost(host) {
    if (typeof host !== 'string' || !host || host.length > 253 || /[\s/*?#@\\]/.test(host) || ['__proto__', 'constructor', 'prototype'].includes(host)) return false;
    try { return new URL(`https://${host}`).hostname === host && new URL(`https://${host}`).port === ''; } catch { return false; }
  }
  P.Domain = { hostname, validHost, origins: host => [`http://${host}/*`, `https://${host}/*`] };
})();
