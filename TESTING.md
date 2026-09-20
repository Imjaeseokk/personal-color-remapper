# V1.1 verification — 2026-09-20

Windows · Node.js 24.12.0 · isolated installed Chrome 153.0.8010.48

- 10 pure unit tests passed.
- 15 local browser integration scenarios passed against dist/chrome-unpacked.
- New coverage: independent ::before/::after colors, stylesheet removal, text-driven :empty changes, 60-second SPA mutation churn.
- Soak: 625 cycles / 60,043 ms, 80 elements created and removed per cycle. Retained-element references: 20 before / 20 after. CSS rule slots: 2,021 before / 2,021 peak / 2,021 after. Idle queue at completion. The free-slot pool retains its high-water allocation; this checks bounded references/slots, not full browser heap leak freedom.
- Adaptive batches target 8ms but are not a hard frame-time guarantee. Slow initial style/layout may exceed the target.
- Public-site results, sampled colors and timings: test-results/sites.json. This is a logged-out public-page smoke test, not certification of all GitHub/Grafana pages, company instances or long-lived authenticated sessions.
- Store assets were rendered at 1280×800 (actual Options), 440×280 (promotion), and 128×128 (icon with padding). No real user data appears in them.

## Remaining manual boundaries

Actual toolbar Popup opening/dismissal, OS native EyeDropper and first-time permission prompts still require normal Chrome UI checks. Shadow DOM, frames, canvas/media pixels, inline !important and running transitions remain outside the supported scope. No Web Store submission or external policy hosting was performed.

## Previous V1.0 report

# Verification report

Date: 2026-09-15 · Windows · Node.js 24.12.0 · installed Google Chrome 152

## Automated checks

- `npm test`: **10 passed**, 0 failed.
- `npm run test:browser`: **12 scenarios passed**, no captured page JavaScript errors.
- JavaScript syntax check: **18 files passed**.
- Dependency install audit: **0 vulnerabilities reported**. The extension has no runtime npm dependencies.

Browser scenarios:

1. Actual MV3 registered content script and storage change apply non-chaining rules.
2. Alpha, modern RGB, background, borders, outline, decoration, SVG, inline-important boundary.
3. Dynamic insertions, original author-style changes, removal handling.
4. Existing element re-evaluation after threshold and target updates; OKLCH adapter.
5. 2,000-element insertion; subsequent single-element insertion scans fewer than 10 elements.
6. Preview Port disconnect restores saved rules.
7. Site OFF blocks global rules; master OFF removes owned attributes and preserves author styles.
8. Persistent profile reapplies after reload and remains correct after SPA navigation.
9. Options HEX validation, actual service-worker save, JSON download contents.
10. Invalid JSON schema rejection; valid import cancel and confirmed replacement.
11. DOM picker reads original red despite existing blue overlay, previews cyan, cancels, saves orange.
12. Unmodified Popup document connects to active tab, previews, cancels and saves a rule.

Screenshots inspected: `test-results/options.png`, `test-results/popup.png`, `test-results/picker.png`. Fixture output: `test-results/fixture.png`. These generated artifacts are excluded from Git and the distribution ZIP.

## Test isolation and boundaries

The harness loads a temporary copy through the official CDP `Extensions.loadUnpacked` API in a disposable browser profile. Only local fixture HTTP/HTTPS host permissions are added to that copy. Production `manifest.json` is optional-host-only. No user browser profile is changed.

The toolbar Popup surface is not a Playwright Page target. Its unmodified HTML/JS is therefore tested in an inactive extension tab while the fixture remains the active website. Port disconnect rollback is tested separately.

Downloaded Playwright browser executables could not start on this Windows system (side-by-side assembly error). Tests passed using installed Chrome in an isolated profile. On Windows the harness defaults to channel `chrome`; other systems default to `chromium`. Override with `PCR_CHROME_CHANNEL` if needed.

## Manual checks still required before a public release

- Toolbar Load Unpacked / opening and dismissal behavior in normal Chrome UI.
- Native permission prompt approval and rejection on a previously ungranted real hostname.
- Native EyeDropper OS pixel selection and cancellation (DOM fallback is automated).
- GitHub/Grafana real-world stylesheet interactions, long-running SPA use, screen readers.
- Very large production documents, CSS animations, stylesheet cascade edge cases.

These are not claimed as automatically verified. See README for supported scope and restoration limitations.
