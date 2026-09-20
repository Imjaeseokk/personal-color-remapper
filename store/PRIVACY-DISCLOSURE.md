# Chrome Web Store privacy fields — factual draft

Single purpose:
Allow users to replace difficult-to-distinguish webpage CSS colors with their chosen colors using local, per-site or global palettes.

Permission justifications:
- storage: Save the enabled state, hostname profiles, HEX rules and similarity thresholds in chrome.storage.local.
- activeTab: Read the active tab's hostname and temporarily connect the remapper when the user opens the extension.
- scripting: Inject isolated content scripts and register them for websites the user has allowed.
- Optional HTTP/HTTPS host access: Automatically reapply saved palettes on approved hosts. Broad optional patterns allow users to choose any regular website; access to all websites is not required at installation.

Remote code:
None. All JavaScript and UI assets ship in the extension. No eval, remote script import, CDN or server-executed feature.

Data processing:
- Source/target colors, thresholds, profile names, hostnames and enable switches are stored locally.
- Page DOM/CSS colors are read and processed locally to perform the requested remapping.
- Screen eyedropper results are used locally to populate the user's rule.
- Page content, browsing history and settings are not collected by or sent to the developer.
- User-triggered exports create a local JSON file.

Publication:
Use the actual public URL hosting privacy.html in the privacy-policy field. Review the dashboard's current definitions when completing data-use checkboxes; local processing and lack of transmission should be described consistently. Do not claim that the extension never accesses website data: DOM/CSS access is its core function.
