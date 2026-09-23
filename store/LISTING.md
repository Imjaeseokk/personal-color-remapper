# Chrome Web Store Listing — Personal Color Remapper v1.2.0

아래 내용은 Chrome Web Store 등록 페이지에 복사해 사용할 수 있는 최종 문안입니다.

## Name

Personal Color Remapper

## Short description

Choose difficult webpage colors and remap similar shades with private, per-site palettes.

---

# Detailed Description

## English

Make difficult webpage colors easier to distinguish with color rules designed by you.

Personal Color Remapper is a personalized color accessibility tool for people who have difficulty distinguishing particular colors, including red and green. Instead of applying one fixed color-blindness filter to an entire page, it lets you select the exact color that causes difficulty, choose a replacement color, and decide how broadly similar shades should be included.

You do not need to know the name or type of a color-vision deficiency. Start from the color that is difficult for you and adjust the result while looking at the real webpage.

HOW IT WORKS

1. Open the extension on the website you want to adjust.
2. Enter a source color or pick an original CSS color directly from the page.
3. Choose a replacement color manually or request an automatic accessible-color suggestion.
4. Adjust the Similarity slider to include only the exact color or a wider range of perceptually similar shades.
5. Preview the result immediately on the current page.
6. Save the rule for the current hostname so it is applied automatically on future visits.

FIND COLORS THAT MAY BE DIFFICULT TO DISTINGUISH

The page color picker can analyze colors currently used by the webpage. It compares page colors under protan and deutan color-vision simulations and highlights pairs that become significantly more similar. Each suggestion shows the detected HEX color, its usage frequency, and another page color it may resemble.

This analysis helps you find possible red/green confusion colors without inspecting every element manually. Suggestions are practical starting points and are not a medical diagnosis; use the live preview to decide which colors are personally useful to replace.

AUTOMATIC REPLACEMENT COLOR

The “Auto target · same brightness & saturation” action recommends a blue, cyan, or purple replacement that remains distinguishable under red/green color-vision simulations. The calculation uses OKLCH and attempts to preserve the source color’s perceptual lightness and chroma. If the exact combination cannot be displayed inside the sRGB gamut, lightness is preserved while chroma is reduced only as much as needed.

You can always replace the recommendation with your own Target color. Check the result against the page background because no automatic choice can guarantee suitable contrast in every design.

PERSONAL RULES AND PALETTES

- Create multiple color replacement rules.
- Give every rule a meaningful name, rename it later, or restore its generated default name.
- Default rule names use the format rule_number_hostname, such as rule_1_github.com.
- Enable, disable, delete, and reorder individual rules.
- Save a different profile for each hostname.
- Create Global rules for websites where access has been granted.
- Domain rules take priority over Global rules, and the first matching rule wins.
- Turn the complete extension or one website profile on and off at any time.
- Duplicate profiles and import or export all saved settings as JSON.

LIVE AND REVERSIBLE

Changes are previewed on the actual page as you edit Source, Target, and Similarity. Unsaved popup changes are discarded when you cancel or close the popup. Disabling the extension removes its overrides and restores the page’s original styling.

Rules are evaluated against original computed colors, preventing chained conversions such as red → blue → purple. Original transparency is retained when a matching opaque Target color is applied.

SUPPORTED WEB CONTENT

Personal Color Remapper supports common HTML, CSS, and SVG color properties:

- Text color
- Background color
- Individual border colors
- Outline color
- Text decoration color
- SVG fill and stroke
- Generated ::before and ::after content using the supported properties
- Dynamically added content on modern single-page applications

The extension uses perceptual OKLab distance instead of comparing individual RGB channels. A Similarity value of 0 matches the exact color; larger values include a wider perceptual neighborhood.

BUILT-IN GUIDE

The popup and Advanced Settings page include a link to a detailed, keyboard-accessible user guide. The guide explains page color suggestions, automatic Target selection, rule naming, Global rules, profiles, backup, restoration, and known limitations.

PRIVACY

- No account or sign-in
- No external server or backend
- No analytics, advertising, or telemetry
- No browsing history, page content, selected colors, or palettes sent to the developer
- Settings stored only in chrome.storage.local
- JSON export occurs only when you request it

The extension requests access to the current site when you choose to pick or save colors there. Access to all regular HTTP/HTTPS websites is optional and is requested only if you choose “Allow all websites” for automatic Global rules.

KNOWN LIMITATIONS

This extension remaps CSS and SVG colors. It does not modify pixels inside images, video, Canvas, WebGL, gradients, Shadow DOM, or iframe contents. Browser-protected pages such as chrome:// pages and the Chrome Web Store cannot be modified. Inline !important colors, active animations, and unusually strict page styling may take precedence over an extension override.

Personal Color Remapper is an accessibility customization tool, not a diagnostic or medical device. Start with a narrow Similarity value and verify that text and background contrast remain readable.

User guide:
https://imjaeseokk.github.io/personal-color-remapper/guide/guide.html

Privacy notice:
https://imjaeseokk.github.io/personal-color-remapper/privacy.html

## 한국어

웹페이지에서 구분하기 어려운 색을 직접 골라 나에게 더 잘 보이는 색으로 바꾸세요.

Personal Color Remapper는 적색과 녹색을 포함해 특정 색상을 구분하기 어려운 사용자를 위한 개인 맞춤 색상 접근성 도구입니다. 페이지 전체에 하나의 고정된 색각 필터를 적용하는 방식 대신, 실제로 불편한 Source 색상과 원하는 Target 색상을 직접 정하고 어느 정도까지 비슷한 색을 함께 바꿀지 선택할 수 있습니다.

자신의 색각 특성 이름이나 유형을 알 필요가 없습니다. 불편한 색에서 시작해 실제 웹페이지를 보면서 결과를 조절하면 됩니다.

사용 방법

1. 색상을 조절할 웹사이트에서 Extension을 엽니다.
2. Source 색상을 직접 입력하거나 페이지에서 원본 CSS 색상을 선택합니다.
3. Target 색상을 직접 선택하거나 자동 대체색 추천을 사용합니다.
4. Similarity 슬라이더로 정확히 같은 색만 바꾸거나 지각적으로 비슷한 색상 범위까지 포함합니다.
5. 현재 페이지에서 결과를 즉시 미리 봅니다.
6. 현재 hostname의 규칙으로 저장하면 다음 방문부터 자동으로 적용됩니다.

페이지에서 적록 혼동 가능성이 있는 색상 찾기

페이지 색상 선택기는 현재 웹페이지가 실제로 사용하는 색상을 분석할 수 있습니다. 페이지 색상들을 protan 및 deutan 색각 시뮬레이션으로 비교하고, 시뮬레이션 후 서로 훨씬 비슷해지는 색상 쌍을 우선 표시합니다. 각 추천에는 감지된 HEX 색상, 페이지 사용 횟수, 혼동될 가능성이 있는 다른 페이지 색상이 함께 표시됩니다.

페이지의 모든 요소를 하나씩 확인하지 않아도 적록 계열의 혼동 후보를 찾을 수 있습니다. 추천 결과는 편리한 출발점이며 의료적 진단이 아닙니다. 실제로 자신에게 도움이 되는 색상인지는 실시간 Preview로 확인하세요.

자동 대체색 추천

“Auto target · same brightness & saturation” 기능은 적록 색각 시뮬레이션에서 구분하기 쉬운 파랑·청록·보라 계열의 대체색을 추천합니다. OKLCH 색 공간을 사용해 원본 색상의 지각적 밝기와 채도를 유지합니다. 동일한 밝기와 채도의 색상이 sRGB 화면 범위를 벗어나는 경우 밝기는 유지하고 채도만 표시 가능한 수준까지 최소한으로 낮춥니다.

추천 결과가 마음에 들지 않으면 언제든 원하는 Target 색상으로 변경할 수 있습니다. 모든 웹 디자인에서 자동 추천이 충분한 대비를 보장할 수는 없으므로 실제 배경과 함께 결과를 확인하세요.

개인 규칙과 팔레트

- 여러 색상 치환 규칙 생성
- 규칙 이름 지정, Rename, 기본 이름 복원
- 기본 이름 형식: rule_번호_hostname(예: rule_1_github.com)
- 규칙별 활성화, 비활성화, 삭제, 순서 변경
- hostname별로 서로 다른 프로필 저장
- 권한을 허용한 사이트에 적용되는 Global 규칙
- Domain 규칙이 Global 규칙보다 우선하며 먼저 일치한 규칙을 적용
- Extension 전체 또는 특정 사이트 프로필 ON/OFF
- 프로필 복제 및 전체 설정 JSON Import/Export

실시간 미리보기와 정확한 원복

Source, Target, Similarity를 편집하면 실제 페이지에서 즉시 미리보기가 적용됩니다. Popup에서 저장하지 않은 편집은 Cancel하거나 Popup을 닫으면 폐기됩니다. Extension을 끄면 Extension이 만든 override가 제거되고 원래 페이지 스타일이 복원됩니다.

규칙은 변환 결과가 아닌 원본 computed color를 기준으로 판단하므로 red → blue → purple처럼 연쇄 변환되지 않습니다. 반투명 원본 색상에 Target을 적용할 때는 원본 alpha를 유지합니다.

지원하는 웹 콘텐츠

- 텍스트 색상
- 배경 색상
- 각 방향의 테두리 색상
- Outline 색상
- Text decoration 색상
- SVG fill과 stroke
- 지원 속성을 사용하는 ::before와 ::after 생성 콘텐츠
- SPA 등에서 동적으로 추가되는 요소

색상 유사도는 RGB 채널별 차이가 아니라 지각적 OKLab 거리를 사용합니다. Similarity 0은 정확히 같은 색만 일치하며 값이 커질수록 더 넓은 유사 색상 범위를 포함합니다.

내장 사용 가이드

Popup과 Advanced Settings에서 키보드로도 이용할 수 있는 상세 사용 가이드를 열 수 있습니다. 페이지 혼동 색상 추천, 자동 Target 선택, 규칙 이름, Global 규칙, 프로필, 백업과 복구, 제한사항을 단계별로 설명합니다.

개인정보 보호

- 계정과 로그인 없음
- 외부 서버와 Backend 없음
- Analytics, 광고, Telemetry 없음
- 브라우징 기록, 페이지 내용, 선택 색상, 팔레트를 개발자에게 전송하지 않음
- 설정은 chrome.storage.local에만 저장
- 사용자가 요청한 경우에만 JSON 파일로 Export

페이지에서 색상을 선택하거나 규칙을 저장할 때 해당 사이트의 접근 권한을 요청합니다. 모든 일반 HTTP/HTTPS 사이트 접근은 선택 사항이며 Global 규칙의 자동 적용을 위해 사용자가 “Allow all websites”를 선택한 경우에만 요청합니다.

알려진 제한사항

이 Extension은 CSS와 SVG 색상을 치환합니다. 이미지, 영상, Canvas, WebGL, gradient, Shadow DOM, iframe 내부 픽셀은 변환하지 않습니다. chrome:// 페이지와 Chrome Web Store 같은 브라우저 보호 페이지에는 적용할 수 없습니다. Inline !important 색상, 실행 중인 animation, 매우 강한 페이지 스타일은 Extension의 override보다 우선할 수 있습니다.

Personal Color Remapper는 개인화 접근성 도구이며 진단 또는 의료기기가 아닙니다. Similarity는 좁은 범위부터 시작하고 텍스트와 배경의 대비가 읽기 쉬운지 확인하세요.

사용 가이드:
https://imjaeseokk.github.io/personal-color-remapper/guide/guide.html

개인정보처리방침:
https://imjaeseokk.github.io/personal-color-remapper/privacy.html

---

# Update Notes — Version 1.2.0

이 extension을 추가해주신 여러분들 정말 감사드립니다! 🙏 🫶 🙇 여러분의 편리한 사용을 위한 업데이트 내용은 아래와 같습니다!

## English

Thank you very much to everyone who added Personal Color Remapper! 🙏 🫶 🙇 Here are the latest improvements designed to make the extension easier and more useful:

VERSION 1.2.0

- Added custom names for individual color rules.
- New rules now receive a descriptive default name in the format rule_number_hostname, such as rule_1_github.com.
- Added Rename and Default actions so you can edit a rule name or restore its generated name at any time.
- Existing rules created with earlier versions are migrated safely and automatically receive default names.
- Added analysis of colors currently used on the webpage to identify likely red/green confusion pairs under protan and deutan simulations.
- Suggested page colors now show their HEX value, usage frequency, and the other page color they may resemble.
- Added one-click selection of a suggested confusing color as the new rule’s Source color.
- Added automatic Target color recommendations using OKLCH.
- Automatic recommendations preserve perceptual lightness and chroma whenever the result fits inside sRGB, and reduce chroma only when required for display.
- Added automatic Target actions to the Popup rule editor, Advanced Settings, and page color picker.
- Added a detailed built-in user guide covering rules, page analysis, automatic colors, Global profiles, backups, privacy, and limitations.
- Added User guide links to both the Popup and Advanced Settings.
- Updated Chrome Web Store screenshots and release documentation for the new interface.
- Expanded automated coverage to 13 unit tests and 15 Chrome integration scenarios, including migration, rule names, page suggestions, automatic Target colors, saving, restoration, and dynamic pages.
- Completed a 60-second SPA stress test with retained element references stable at 20 before and after the test.

Note: color-confusion suggestions are accessibility aids, not medical diagnoses. Please confirm each recommendation with the live preview on the actual page.

## 한국어

Personal Color Remapper를 추가해주신 모든 분께 정말 감사드립니다! 🙏 🫶 🙇 더 편리하고 유용하게 사용할 수 있도록 다음 기능을 개선했습니다.

버전 1.2.0

- 개별 색상 규칙에 사용자 지정 이름을 붙일 수 있습니다.
- 새 규칙에는 rule_번호_hostname 형식의 기본 이름이 자동으로 생성됩니다. 예: rule_1_github.com
- Rename과 Default 버튼을 추가해 규칙 이름을 변경하거나 언제든 자동 생성 이름으로 되돌릴 수 있습니다.
- 이전 버전에서 만든 기존 규칙도 안전하게 이전되며 기본 이름이 자동으로 추가됩니다.
- 현재 웹페이지에서 실제로 사용 중인 색상을 분석해 protan/deutan 시뮬레이션에서 혼동될 가능성이 있는 적록 색상 쌍을 찾는 기능을 추가했습니다.
- 추천 색상에 HEX 값, 페이지 사용 횟수, 혼동될 가능성이 있는 다른 페이지 색상을 함께 표시합니다.
- 추천된 혼동 색상을 한 번의 클릭으로 새 규칙의 Source 색상으로 선택할 수 있습니다.
- OKLCH 기반 자동 Target 색상 추천을 추가했습니다.
- 자동 추천은 가능한 경우 원본의 지각적 밝기와 채도를 그대로 유지하며, sRGB 화면 범위를 벗어나는 경우에만 채도를 필요한 만큼 줄입니다.
- Popup 규칙 편집기, Advanced Settings, 페이지 색상 선택기에 자동 Target 기능을 추가했습니다.
- 규칙, 페이지 색상 분석, 자동 색상, Global 프로필, 백업, 개인정보 보호, 제한사항을 설명하는 상세 내장 사용 가이드를 추가했습니다.
- Popup과 Advanced Settings에 User guide 링크를 추가했습니다.
- 새로운 UI에 맞춰 Chrome Web Store 스크린샷과 배포 문서를 갱신했습니다.
- 이전 데이터 migration, 규칙 이름, 페이지 추천, 자동 Target, 저장과 원복, 동적 페이지를 포함하도록 자동 테스트를 단위 테스트 13개와 Chrome 통합 시나리오 15개로 확장했습니다.
- 60초 SPA 반복 테스트에서 테스트 전후 유지 요소 참조가 20개로 동일한 것을 확인했습니다.

참고: 색상 혼동 추천은 접근성 보조 기능이며 의료적 진단이 아닙니다. 실제 페이지의 실시간 Preview를 통해 각 추천 결과를 확인해 주세요.

## Deutsch

Vielen Dank an alle, die Personal Color Remapper hinzugefügt haben! 🙏 🫶 🙇 Damit die Erweiterung noch einfacher und hilfreicher wird, enthält dieses Update die folgenden Verbesserungen:

VERSION 1.2.0

- Einzelne Farbregeln können jetzt benutzerdefinierte Namen erhalten.
- Neue Regeln bekommen automatisch einen Standardnamen im Format rule_nummer_hostname, zum Beispiel rule_1_github.com.
- Mit Rename und Default kann ein Regelname geändert oder jederzeit auf den automatisch erzeugten Namen zurückgesetzt werden.
- Vorhandene Regeln aus früheren Versionen werden sicher übernommen und erhalten automatisch Standardnamen.
- Die Erweiterung kann jetzt die auf der aktuellen Webseite verwendeten Farben analysieren und Farbpaare hervorheben, die in Protan- oder Deutan-Simulationen leicht verwechselt werden können.
- Vorgeschlagene Farben zeigen den HEX-Wert, die Verwendungshäufigkeit und die andere Seitenfarbe, mit der sie verwechselt werden könnte.
- Eine vorgeschlagene problematische Farbe kann mit einem Klick als Source-Farbe einer neuen Regel ausgewählt werden.
- Automatische Target-Farbempfehlungen auf Basis von OKLCH wurden hinzugefügt.
- Die Empfehlung behält die wahrgenommene Helligkeit und Farbsättigung bei, sofern das Ergebnis im sRGB-Farbraum darstellbar ist. Die Farbsättigung wird nur dann reduziert, wenn dies für die Darstellung erforderlich ist.
- Die automatische Target-Auswahl ist im Popup-Regel-Editor, in den Advanced Settings und in der Farbauswahl auf der Webseite verfügbar.
- Eine ausführliche integrierte Anleitung erklärt Regeln, Seitenanalyse, automatische Farben, globale Profile, Sicherungen, Datenschutz und bekannte Einschränkungen.
- Links zur Anleitung wurden dem Popup und den Advanced Settings hinzugefügt.
- Screenshots und Veröffentlichungsunterlagen für den Chrome Web Store wurden an die neue Benutzeroberfläche angepasst.
- Die automatisierten Tests wurden auf 13 Unit-Tests und 15 Chrome-Integrationsszenarien erweitert. Sie prüfen unter anderem Migration, Regelnamen, Seitenvorschläge, automatische Target-Farben, Speichern, Wiederherstellung und dynamische Webseiten.
- Ein 60-sekündiger SPA-Belastungstest wurde erfolgreich abgeschlossen; die Anzahl der gehaltenen Elementreferenzen blieb vor und nach dem Test stabil bei 20.

Hinweis: Die Vorschläge zu möglicherweise verwechselbaren Farben sind eine Bedienungshilfe und keine medizinische Diagnose. Prüfen Sie jede Empfehlung mit der Live-Vorschau auf der tatsächlichen Webseite.
