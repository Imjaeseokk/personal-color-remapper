# Chrome Web Store 등록 입력 문안

이 파일은 Chrome Web Store의 `개인 정보 보호 관행` 탭에 복사해 넣을 문안입니다. 서비스에 맞게 작성했지만 게시자 이메일과 공개 개인정보처리방침 URL은 직접 입력해야 합니다.

## 1. 단일 목적(Single purpose)

Personal Color Remapper has one purpose: to help people who have difficulty distinguishing particular colors replace selected webpage CSS colors, including similar colors within a user-controlled similarity range, with colors they can distinguish more easily. Users choose the source color, target color, similarity threshold, and the websites where the rule applies. The extension provides per-site and global palettes, live preview, and reversible CSS changes. It does not diagnose color-vision deficiency or provide medical treatment.

한국어 참고:

> Personal Color Remapper의 단일 목적은 특정 색상을 구분하기 어려운 사용자가 웹페이지의 CSS 색상과 사용자가 지정한 유사 색상 범위를 자신이 더 잘 구분할 수 있는 색상으로 바꾸도록 돕는 것입니다. 사용자는 Source 색상, Target 색상, 유사도 범위와 적용 사이트를 직접 선택합니다. 이 확장 프로그램은 색각 이상을 진단하거나 의료적 치료를 제공하지 않습니다.

## 2. 원격 코드(Remote code) 사용 이유

Remote code is not used. All JavaScript, HTML, CSS, color-conversion logic, content scripts, service-worker code, and extension assets are bundled inside the uploaded extension package. The extension does not load or execute JavaScript, WebAssembly, scripts, libraries, or UI code from a remote server, CDN, iframe, or external URL. It does not use `eval()` or dynamically fetch executable code. Website content is read locally only to apply the user's color rules.

한국어 참고:

> 원격 코드를 사용하지 않습니다. JavaScript, HTML, CSS, 색상 계산 로직, Content Script, Service Worker와 확장 프로그램 리소스는 모두 업로드 ZIP 안에 포함되어 있습니다. 서버, CDN 또는 외부 URL에서 실행 코드를 내려받거나 실행하지 않으며 `eval()`도 사용하지 않습니다.

웹스토어에 “원격 코드 사용 이유”를 입력해야만 진행되는 UI라면 위 영문을 그대로 입력하고, 원격 코드를 실제로 사용하지 않는다는 의미의 선택지가 있으면 `사용하지 않음`을 선택하세요. 원격 코드를 사용한다고 허위로 표시하면 안 됩니다.

## 3. 데이터 사용 정책 인증(Data-use certification)

웹스토어의 인증 체크박스는 문서로 대신할 수 없습니다. 다음 사실을 확인한 뒤 항목 수정 페이지에서 직접 인증하세요.

> I certify that this extension uses user data in accordance with the Chrome Web Store Developer Program Policies. The extension processes webpage DOM/CSS colors locally to perform the user's requested color remapping. It stores palettes, rules, profile names, hostnames, and enable settings in `chrome.storage.local`. It does not transmit page content, browsing history, selected colors, or settings to the developer or any external server. It has no account, analytics, advertising, telemetry, or cloud service.

인증 전에 다음을 확인하세요.

- 실제 동작과 위 설명이 일치함
- 저장·처리되는 데이터와 전송하지 않는 데이터가 대시보드 선택값과 일치함
- 추후 서버나 분석 기능을 추가하면 개인정보 관행을 다시 검토함

## 4. 권한별 사용 이유

### `activeTab`

The `activeTab` permission lets the extension identify and temporarily connect to the page the user is actively viewing after the user invokes the extension from its toolbar button. It is used to read the current hostname, start the page color picker, preview color rules, and communicate with the content script for the current tab. It is not used to collect browsing history or access tabs in the background.

### `scripting`

The `scripting` permission lets the extension inject its bundled, isolated content scripts into a website after the user has granted access. The scripts read computed CSS colors locally, apply the user's saved rules with a reversible extension stylesheet, observe dynamic DOM changes, and remove their own changes when disabled. The permission is also used to register the same bundled scripts for hosts the user approved, so saved palettes work on later visits.

### `storage`

The `storage` permission lets the extension save and restore the user's local settings in `chrome.storage.local`: the global and hostname profiles, source and target HEX colors, similarity thresholds, rule enabled states, profile names, and the global/site enabled switches. The settings are not sent to the developer, a server, analytics service, or a cloud account.

## 5. 데이터 처리 요약

### Data handled locally

- Webpage DOM and computed CSS color values, only while applying or previewing a user rule
- Source and target HEX colors
- Similarity thresholds and rule enabled states
- Hostnames for profiles the user creates
- Profile names and extension/site enabled states
- Color selected through the optional screen eyedropper

### Data not collected or transmitted

- No browsing history collection
- No page content upload
- No account identifiers
- No analytics or telemetry
- No advertising identifiers
- No external server or cloud synchronization

### User-triggered export

The user can export a JSON backup to their own device. The export can contain the hostnames and rules the user configured. It is created only after the user clicks Export; the extension does not upload or share the file.

## 6. 공개 개인정보처리방침 URL

`store/privacy.html`은 초안 파일입니다. 웹스토어의 개인정보처리방침 URL에는 사용자가 관리하는 공개 HTTPS 주소를 입력해야 합니다.

입력 예시 형식:

`https://your-domain.example/privacy/personal-color-remapper.html`

로컬 경로, `file://` URL, `localhost`, 저장소 폴더 링크는 공개 정책 URL로 사용할 수 없습니다. 실제 URL을 게시한 뒤 웹스토어에 입력하세요.

## 7. 게시자 연락처

연락처 이메일은 이 프로젝트 파일에 임의로 적지 않았습니다. Chrome Web Store Developer Dashboard의 설정 페이지에서 실제로 연락 가능한 이메일을 입력하고 인증 메일의 링크를 눌러야 합니다.

- 연락처 이메일 입력
- 인증 메일 재전송 또는 인증 절차 시작
- 인증 완료 상태 확인
- 항목 수정 페이지로 돌아와 임시저장

이메일 인증은 코드나 Markdown 파일로 처리할 수 없는 계정 작업입니다.

## 8. 웹스토어 제출 직전 체크리스트

- [ ] 단일 목적 문구 입력
- [ ] 원격 코드: 사용하지 않음 또는 위 설명 입력
- [ ] `activeTab`, `scripting`, `storage` 권한 이유 입력
- [ ] 데이터 사용 정책 인증 체크박스 확인
- [ ] 공개 HTTPS 개인정보처리방침 URL 입력
- [ ] 게시자 연락처 이메일 입력
- [ ] 연락처 이메일 인증 완료
- [ ] 스토어 화면 캡처 최소 1개 업로드: `store/screenshots/`
- [ ] 440×280 프로모션 이미지 업로드: `store/assets/promo-440x280.png`
- [ ] `dist/personal-color-remapper-1.2.0-chrome.zip` 업로드
- [ ] **임시저장** 클릭 후 오류가 사라졌는지 확인

관련 파일:

- 권한·개인정보 사실 초안: `store/PRIVACY-DISCLOSURE.md`
- 게시 안내: `store/UPLOAD-GUIDE.md`
- 개인정보처리방침 HTML 초안: `store/privacy.html`
