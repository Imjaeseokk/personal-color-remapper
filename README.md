# Personal Color Remapper

특정 색상을 구분하기 어려운 사용자를 위한 **개인화 색상 치환 Chrome Extension**입니다. 색각 유형을 진단하거나 페이지 전체 필터를 선택하는 대신, **Source → Similarity → Target → Preview → Save**로 자신에게 맞는 색을 정합니다.

Manifest V3 · Vanilla JavaScript · 외부 서버 없음 · 로컬 저장

## Features

- Source/Target 색상 선택과 직접 HEX 입력, 실시간 validation
- OKLab 기반 유사도 슬라이더, 원본 알파 유지
- 여러 규칙의 활성화·삭제·순서 변경
- 규칙별 이름, `rule_{number}_{hostname}` 기본 이름, Rename/Default 복원
- 사이트별 프로필과 전역 프로필, 전체 및 현재 사이트 ON/OFF
- Popup의 실시간 미리보기, Cancel 및 Popup 종료 시 미저장 변경 원복
- 페이지 안의 DOM 색상 선택기와 Chrome EyeDropper 버튼
- 현재 페이지의 적녹 색각 혼동 후보 분석과 바로 선택
- OKLCH 밝기·채도를 보존하는 자동 대체색 추천
- Options의 프로필 이름 변경·복제·삭제·JSON Import/Export·Reset
- 동적 DOM 검사, 변경된 subtree batching, 계산 결과 캐시
- V1.1: 생성된 ::before/::after 색상 치환, 스타일시트 제거 재평가, 적응형 batch 처리
- V1.2: 규칙 이름, 적녹 혼동 후보, 자동 대체색, 내장 HTML 사용 가이드
- 키보드 조작, 명시적 label, HEX 텍스트, focus 표시, 상태 메시지

## Installation — Chrome Load Unpacked

1. Chrome에서 `chrome://extensions`를 엽니다.
2. 오른쪽 위 **개발자 모드**를 켭니다.
3. **압축해제된 확장 프로그램을 로드합니다**를 누릅니다.
4. `dist/chrome-unpacked` 폴더를 선택합니다. `manifest.json`이 바로 안에 있어야 합니다. 개발 중에는 소스 루트도 로드할 수 있습니다.
5. 도구 모음에 확장 프로그램을 고정합니다.
6. 일반 HTTP/HTTPS 페이지에서 확장 프로그램 아이콘을 누릅니다.

**빌드나 npm 설치는 실행에 필요하지 않습니다.** 개발 의존성은 테스트 전용입니다. 확장 프로그램을 다시 로드한 후에는 이미 열린 웹페이지도 새로고침하세요. Chrome 111 이상을 대상으로 합니다.

## How to use

### Popup에서 직접 규칙 만들기

1. 대상 사이트를 열고 Popup을 엽니다.
2. **+ Add color rule**을 누릅니다.
3. Source에 `#28A745`, Target에 `#2979FF` 등을 지정합니다. `#RGB`와 `#RRGGBB`를 지원합니다.
4. Similarity를 조절합니다. **0은 정확한 색상**, **15는 근처 색상**, 큰 값은 더 넓은 범위를 의미합니다. 밝기 차이도 거리에 포함됩니다.
5. 현재 페이지에 미리보기가 적용됩니다. 전체 또는 사이트 스위치가 OFF이면 색상은 바뀌지 않습니다.
6. **Save for site**를 누르고 해당 사이트 권한을 허용합니다. 이후 그 hostname 방문에 자동 적용됩니다.
7. **Cancel**하거나 Popup을 닫으면 미저장 규칙은 폐기됩니다. 전체 ON/OFF는 즉시 저장되는 별도 설정입니다.

### 웹페이지에서 색 선택

1. **Pick color from page**를 누릅니다. 해당 사이트의 지속 권한을 요청합니다.
2. Popup이 닫히고 페이지 오른쪽 위에 색상 선택 패널이 열립니다.
3. 페이지의 요소를 클릭합니다. 기본 선택은 text `color`이며 **Element color property**에서 background, border, fill 등 실제 원하는 속성을 선택할 수 있습니다. 각 옵션에 속성명과 HEX가 표시됩니다.
4. **Likely red/green confusion colors**에서 현재 페이지의 적녹 색각 혼동 후보를 바로 Source로 선택할 수도 있습니다.
5. **Auto target · same brightness & saturation**으로 OKLCH 밝기·채도를 유지한 대체색을 추천받거나 직접 Target을 고릅니다.
6. 또는 패널의 **Screen eyedropper**를 누릅니다. API가 없으면 이 버튼만 비활성화됩니다.
7. Similarity를 지정하고 **Preview**를 누릅니다. 이후 입력은 즉시 미리보기에 반영됩니다.
8. **Add rule & save**로 현재 도메인에 저장하거나 **Cancel / Escape**로 원복합니다.

DOM picker는 원본 computed CSS 색상을 읽습니다. Screen eyedropper는 화면에 보이는 합성 픽셀을 읽으므로 투명도·이미지·기존 변환의 영향을 받습니다. 이미지 픽셀을 선택할 수 있어도 이미지 자체를 치환하는 것은 아닙니다. 페이지 패널에서 직접 버튼을 눌러 EyeDropper의 transient user activation 요건을 충족합니다. API 오류가 나면 DOM 선택을 계속 사용할 수 있습니다.

키보드로는 Tab으로 페이지 요소에 이동해 Enter로 선택하거나 패널의 Source HEX를 직접 입력할 수 있습니다. Escape는 선택과 미리보기를 취소합니다. 패널은 비모달이며 페이지 탐색을 막는 focus trap을 사용하지 않습니다.

적녹 혼동 후보는 페이지에서 최대 2,500개 표시 요소와 240개 고빈도 색을 표본으로 수집한 뒤, protan/deutan 시뮬레이션에서 정상 OKLab 거리보다 크게 가까워지는 색상 쌍을 순위화합니다. 진단 결과가 아니므로 실제 불편 여부는 Preview로 확인해야 합니다. 자동 Target은 원본 OKLCH L/C를 유지하고 파랑·청록·보라 후보 중 시뮬레이션 구분 거리가 큰 색을 선택합니다. 동일 L/C가 sRGB gamut 밖이면 L은 유지하고 C만 표시 가능한 범위까지 줄입니다.

Popup과 Options의 **User guide**는 Extension에 포함된 오프라인 가이드를 엽니다. 공개 가이드는 [GitHub Pages](https://imjaeseokk.github.io/personal-color-remapper/guide/guide.html)에서도 볼 수 있습니다.

### Palette 관리

**Advanced settings**에서 전역·도메인 프로필을 편집합니다. Options의 편집은 **Save palette** 시 열린 연결 페이지에 적용됩니다. 실시간 미저장 미리보기는 Popup과 페이지 picker에서 제공합니다.

- 새 도메인은 `github.com`처럼 hostname만 입력합니다. 프로필 생성만으로 권한을 요청하지 않으며 Save 때 요청합니다.
- 복제 시 대상 hostname을 입력하고 기존 프로필을 덮어쓸 때 확인합니다.
- Export는 **저장된 설정**만 JSON으로 내보냅니다.
- Import는 JSON, schema version, hostname, HEX, boolean, rule ID 중복, threshold, 크기/개수 제한을 검증한 다음 덮어쓰기 확인을 받습니다. Import 자체는 사이트 권한을 부여하지 않습니다.
- Reset은 설정을 초기화합니다. 사이트 권한은 별도의 **Revoke all site access**로 관리합니다.

## Domain profiles & priority

hostname 단위입니다. `github.com`과 `gist.github.com`은 별도입니다. 같은 hostname의 HTTP/HTTPS와 포트는 동일 프로필을 사용합니다. 경로·쿼리·SPA history 변경은 프로필에 영향을 주지 않습니다.

1. 전체 enabled가 false이면 적용하지 않습니다.
2. 해당 도메인 프로필이 존재하고 enabled가 false이면 전역 규칙까지 차단합니다.
3. 활성 도메인 규칙을 배열 순서대로 검사합니다.
4. 일치하지 않으면 활성 전역 규칙을 배열 순서대로 검사합니다.
5. 처음 일치하는 규칙 한 개만 적용합니다. 가장 가까운 규칙을 선택하는 방식이 아닙니다.

따라서 domain red→blue와 global red→orange가 동시에 match하면 blue가 됩니다. 원래 red가 red→blue→purple로 연쇄 변환되지는 않습니다. 프로필 삭제 후에는 전역 규칙이 다시 적용될 수 있습니다.

## Color matching algorithm

```text
Computed CSS color → sRGB → linear RGB → OKLab
                                      ↓
                    100 × Euclidean distance(L, a, b)
                                      ↓
                         distance ≤ rule.threshold
                                      ↓
                           Target RGB + original alpha
```

슬라이더 범위는 0–100, 기본값은 15입니다. 이 값은 RGB 오차나 Delta E 2000 단위가 아니라 **OKLab 유클리드 거리 × 100**입니다. 사용자마다 적절한 범위가 다르므로 미리보기로 조절합니다. Target은 지정한 색상으로 치환하며 원본의 밝기/명암 차이를 따로 보존하는 tint 알고리즘은 아닙니다.

순수 함수는 HEX, RGB/RGBA, percentage 및 space/slash RGB를 처리합니다. 브라우저 adapter는 CSS.supports와 1×1 로컬 Canvas로 named colors, HSL, OKLCH, color() 등을 sRGB로 정규화합니다. wide-gamut 색상은 sRGB로 축소되고 해당 adapter의 alpha는 8-bit 정밀도입니다. `url()`, paint server, `none`, unresolved `var()` 등은 건너뜁니다. 알파 0은 그대로 둡니다.

계산식 출처: [Björn Ottosson의 OKLab 원문](https://bottosson.github.io/posts/oklab/).

## Architecture

```text
 Popup / Options / Page Picker
       │             │
       │ preview     │ serialized save messages
       ▼             ▼
 Content Script   Service Worker ── Storage adapter ── chrome.storage.local
       ▲                                  │
       └──────── storage.onChanged ────────┘
       │
 Color Engine (pure math, cache, first match)
       │
 DOM Scanner (computed styles, queue, observer)
       │
 Constructed stylesheet + owned marker attributes
       │
      Page
```

- **UI:** Popup, Options, 공용 rule editor. 문자열 데이터는 textContent로 표시합니다.
- **Color math/engine:** DOM·storage와 분리된 순수 parser, OKLab 및 규칙 matching.
- **Storage:** 유일한 storage area 선택은 `utils/storage.js`. 버전 검증을 통과한 상태만 저장합니다. worker의 직렬 queue로 서로 다른 프로필 저장이 유실되지 않도록 처리합니다. 같은 프로필을 동시에 편집하면 마지막 저장이 우선합니다.
- **Messaging:** 이름은 `utils/constants.js`에 모읍니다. Popup 미리보기는 Port 수명에 연결되어 Popup 종료 시 자동 복원됩니다.
- **Domain:** `utils/domain.js`에서 hostname 정책을 분리합니다.
- **DOM:** 원본 inline style은 변경하지 않습니다. match한 요소에 고유한 확장 전용 data attribute를 붙여 constructed stylesheet로 override합니다. 매 batch의 computed style 측정 동안 확장 stylesheet 전체를 잠시 disabled로 바꾸고, 같은 동기 작업 안에서 되돌립니다. 원본을 재측정하므로 inheritance를 통한 재매칭도 막습니다.
- **Restoration:** rule 변경 때 overlay를 재생성하고, OFF 때 stylesheet와 소유 attribute를 제거합니다. 페이지가 스스로 변경한 inline style도 보존합니다.
- **Performance:** 초기 및 규칙 변경 시 전체 검사, 이후 추가 subtree·attribute 변경 대상으로 batching. 20–250 elements/batch를 직전 처리 시간에 맞춰 조절(목표 8ms; 엄격한 상한은 아님), 60ms mutation batching, 최대 4096 color cache. 제거된 요소는 Map에서 정리하며 stylesheet rule 슬롯을 재사용합니다. 강한 Map 참조는 활성 match만 추적하기 위해 사용하고 연결이 끊긴 요소를 삭제합니다. 원본 computed 색상을 영구 캐시하지 않아 테마 변경 후 오래된 원본을 쓰지 않습니다.
- **Stylesheets:** resize, stylesheet load, style text 변경은 페이지 전체에 영향을 줄 수 있어 재검사합니다. hover/focus/change/end events는 해당 subtree를 재검사합니다.

## Project structure

```text
personal-color-remapper/
├── manifest.json
├── icons/       # 16/32/48/128 PNG toolbar assets
├── background/service-worker.js
├── content/
│   ├── content.js
│   ├── color-engine.js
│   ├── dom-scanner.js
│   └── picker.js
├── popup/       # HTML / CSS / JS
├── options/     # HTML / CSS / JS
├── ui/          # shared CSS + rule editor
├── utils/       # constants, color, domain, model, storage
├── test/        # pure tests, real browser harness, fixture
├── scripts/     # runtime packaging + store asset generation
├── store/       # upload guide, listing/privacy drafts, store images
├── dist/        # generated runtime-only folder and upload ZIP
├── package.json
└── README.md
```

Classic isolated-world scripts는 namespace에 모듈을 노출합니다. content script의 동적 import용 web_accessible_resources나 번들러를 추가할 필요가 없습니다. background는 importScripts, UI는 CSP 호환 외부 defer scripts를 사용합니다. 서비스 워커에서 DOM에 접근하지 않습니다.

## Data model & migration

저장 key는 `pcr-state`입니다.

```json
{
  "version": 1,
  "settings": { "enabled": true },
  "globalProfile": { "enabled": false, "name": "Global palette", "rules": [] },
  "profiles": {
    "github.com": {
      "enabled": true,
      "name": "GitHub Work",
      "rules": [
        { "id": "example-rule", "name": "Success green", "customName": true, "enabled": true, "source": "#28A745", "target": "#2979FF", "threshold": 15 }
      ]
    }
  }
}
```

Export에는 `schemaVersion: 1`, `exportedAt`이 포함됩니다. 이름이 없는 V1.0/V1.1 규칙은 읽을 때 `rule_{number}_{hostname}`으로 안전하게 보완됩니다. 현재는 v1만 지원하며 미래 버전 데이터는 조용히 다운그레이드하지 않고 오류를 표시합니다. 손상된 storage는 content script에서 적용을 중지하고 Options에서 Import/Reset으로 복구할 수 있습니다. 원본 손상 데이터를 자동 덮어쓰지 않습니다. 제한: 프로필 500개, 프로필당 규칙 100개, import 파일 2 MB.

## Permissions

| 권한 | 목적 |
|---|---|
| storage | 브라우저 내부 설정 저장 |
| activeTab | 사용자가 Popup을 연 현재 사이트의 일시적 접근 및 URL 확인 |
| scripting | content script 주입과 승인된 사이트의 지속 등록 |
| optional_host_permissions: HTTP/HTTPS | 사용자가 저장/선택 시 해당 hostname에만 권한 요청. 전역 적용은 Options에서 선택적으로 전체 허용 |

필수 host_permissions, `<all_urls>`, tabs, history, webRequest, 서버 통신 권한은 없습니다. 임의 hostname을 사용자가 지정할 수 있어 HTTP/HTTPS wildcard를 **요청 가능 범위**로 선언하지만 설치 시 전체 사이트 접근을 부여하지 않습니다. 승인된 사이트는 registerContentScripts의 persistent 등록을 사용해 다음 방문에 자동 적용합니다. 기존 탭은 Popup으로 연결하거나 새로고침해야 합니다. 권한을 철회한 기존 탭의 실행 스크립트는 페이지 새로고침으로 완전히 제거됩니다.

Chrome Web Store, chrome://, 다른 extension 페이지 등 보호 페이지에는 Chrome 정책상 주입할 수 없습니다. file://는 V1에서 지원하지 않으며 fixture는 localhost로 엽니다.

공식 API 참고: [Chrome optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions), [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [EyeDropper의 사용자 동작 요건](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper/open), [Constructed stylesheets](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet).

## Privacy

외부 서버, 회원가입, analytics, telemetry, 클라우드 동기화가 없습니다. 브라우징 기록·페이지 내용·설정·선택 색상을 외부로 전송하지 않습니다. 설정은 chrome.storage.local에만 저장하며 Export는 사용자가 직접 내려받는 파일입니다. 웹폰트/CDN/외부 runtime dependency를 사용하지 않습니다. analytics를 향후 추가하려면 별도의 명시적 동의 설계가 필요합니다.

## Known limitations

- 주요 대상: HTML text, background-color, 네 방향 border, outline, text-decoration-color, SVG fill/stroke, 생성된 ::before/::after의 같은 색상 속성.
- 이미지·video·Canvas·WebGL 픽셀, gradient·shadow, ::marker/::selection 등 기타 pseudo-elements, shadow DOM, iframe 내부(동일 origin 포함)는 V1 범위 밖입니다.
- 원본 **inline `!important`** 색상은 stylesheet override보다 우선하므로 바뀌지 않습니다. 다른 높은 cascade 우선순위나 transition도 결과에 영향을 줄 수 있습니다. 기존 inline style을 보존하는 설계의 명시적 한계입니다.
- CSS animation/transition 프레임마다 추적하지 않습니다. 시작/진행 중 색은 완벽히 맞지 않을 수 있고 종료 이벤트에서 재평가합니다.
- `CSSStyleSheet.insertRule()` 같은 페이지 자체 CSSOM 직접 변경은 MutationObserver에 잡히지 않습니다. 원격 sibling/`:has()`/구조적 selector로 변경 subtree 바깥의 색이 바뀌는 경우 즉시 감지하지 못할 수 있습니다. Popup을 다시 적용하거나 새로고침하세요.
- batch마다 원본 계산용 stylesheet toggle이 필요하므로 매우 큰 DOM에서는 style recalculation 비용이 있습니다. 지속 전체 polling은 하지 않습니다.
- data attribute/stylesheet 추가는 페이지에 관찰 가능합니다. 의도적으로 모든 DOM 변화를 막거나 adoptedStyleSheets를 교체하는 페이지와의 호환은 보장하지 않습니다.
- 색상 치환이 모든 대비/의미를 개선한다고 보장하지 않습니다. 텍스트와 배경을 같은 target으로 바꾸지 않도록 실제 페이지를 보며 좁은 범위부터 조절하세요.

## Development & testing

Node.js 20 이상 권장. 런타임 의존성은 없으며 Playwright는 개발 의존성입니다.

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

Windows에서는 설치된 Google Chrome을 격리 프로필로 실행하고, 다른 OS에서는 Playwright Chromium을 사용합니다. `PCR_CHROME_CHANNEL=chromium` 또는 `chrome` 환경변수로 바꿀 수 있습니다. 테스트 확장 로드는 공식 CDP `Extensions.loadUnpacked`를 사용하며 실제 사용자 Chrome 데이터는 사용하지 않습니다.

단위 테스트: HEX/RGB/alpha parsing, invalid input, OKLab 기준값·거리, threshold, alpha 보존, chain 방지, cache 갱신, domain precedence, import validation.

브라우저 테스트: 임시 복사본에 **로컬 fixture hostname만 테스트 권한으로 부여**하여 실제 MV3 worker·content registration·storage messaging과 DOM 변환/원복을 검사합니다. 제품 manifest는 변경하지 않습니다. Popup 문서는 비활성 테스트 탭에서 실제 활성 탭과 연결해 검사합니다. Chrome 도구 모음의 실제 Popup 표면, optional permission 승인 창과 native EyeDropper의 OS 화면 선택은 아래 수동 테스트로 확인해야 합니다. 테스트가 생성한 격리 프로필/복사본은 종료 시 삭제하며 사용자 Chrome 프로필에는 접근하지 않습니다. `test-results/`에 스크린샷을 생성합니다. 최근 검증 범위는 [TESTING.md](TESTING.md)에 기록합니다.

수동 fixture:

```sh
npm run fixture
```

`http://127.0.0.1:8080`을 열어 확장 프로그램으로 테스트합니다. 테스트 서버는 개발용이며 확장 프로그램 운영에는 서버가 필요하지 않습니다.

### Manual release checklist

- [ ] 실제 Chrome Load Unpacked → Popup 열기 → 현재 hostname 확인
- [ ] Source HEX 직접 입력 및 잘못된 입력 오류, 키보드 Tab/focus
- [ ] red→blue, blue→purple을 동시 설정: 원래 red는 blue 유지
- [ ] similarity 0→5→15 확대 및 target 변경을 기존 요소에서 확인
- [ ] 반투명 text, background, 네 border, SVG fill/stroke 확인
- [ ] Popup Cancel, Popup 외부 클릭 종료, 페이지 picker Escape 원복
- [ ] 사이트 권한 거절 후 안내, 허용 후 재방문 자동 적용
- [ ] DOM picker 속성 선택 및 화면 EyeDropper 선택/취소
- [ ] Dynamic DOM 추가·변경·삭제, SPA 버튼, 새로고침
- [ ] global/domain 충돌, site OFF, global OFF 및 복원
- [ ] 프로필 복제·삭제, 잘못된 JSON, 정상 import/export, Reset
- [ ] Chrome 권한 철회 후 재방문 시 자동 주입 안 됨

## Future roadmap

1. 실제 사용자 환경에서 수시간 단위 QA, 화면낭독기 및 native EyeDropper 확인
2. open shadow DOM, ::marker 등 추가 가상 요소, 외부 CSSOM 변화 지원
3. property scope, priority/metadata, URL pattern, sync migration
4. 사용자 맞춤 프리셋과 선택적 Daltonization — 직접 규칙 UX는 유지
5. Canvas/WebGL/image/video 처리 연구, shared palette 파일 포맷

계정·서버·community cloud·AI recommendation은 MVP에 포함하지 않습니다.

## V1.2 release files

- **Chrome Load Unpacked:** `dist/chrome-unpacked/`
- **Chrome Web Store ZIP:** `dist/personal-color-remapper-1.2.0-chrome.zip`
- **스토어 제출 안내·문안·이미지:** [store/UPLOAD-GUIDE.md](store/UPLOAD-GUIDE.md)
- **포함 파일 및 SHA-256:** `dist/BUILD-INFO.json`

`npm run package`는 허용 목록의 실행 파일 26개만 복사합니다. 테스트·Git·node_modules·개발 문서·스토어 제출 자료는 ZIP에 들어가지 않습니다. 같은 소스는 같은 ZIP 바이트를 만듭니다. 기존 ZIP 대신 V1.2 ZIP을 사용하세요.

`npm run test:sites`는 로그인하지 않은 격리 Chrome으로 공개 GitHub 저장소와 Grafana Play의 실제 CSS 색상 적용/원복을 확인합니다. `npm run test:browser`에는 기본 60초 반복 SPA 검사가 포함됩니다. `PCR_EXTENSION_DIR=dist/chrome-unpacked`로 배포 파일 자체를 검사할 수 있습니다. 테스트 배율 설정 `PCR_SOAK_MS`는 기본 60000입니다.

스토어용 화면 이미지는 `node scripts/store-assets.mjs`로 생성합니다. 샘플 팔레트는 이 스크립트의 임시 테스트 프로필에만 저장됩니다. 제품 기본 설정에는 포함되지 않습니다.
