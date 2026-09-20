# Chrome 업로드 안내 — 1.1.0

## 1. 내 Chrome에서 사용하기

프로젝트의 **dist/chrome-unpacked** 폴더만 사용합니다.

1. Chrome에서 chrome://extensions 를 엽니다.
2. 개발자 모드를 켭니다.
3. '압축해제된 확장 프로그램을 로드합니다'를 누릅니다.
4. dist/chrome-unpacked 폴더를 선택합니다.

ZIP은 먼저 압축을 풀어야 합니다. 기존 소스 폴더 버전을 설치했다면 같은 확장을 중복 설치하지 말고 기존 항목을 제거한 뒤 이 폴더를 로드하세요. 제거하면 해당 설치의 설정이 삭제되므로 필요한 경우 먼저 Options에서 Export하세요. 기존 설치를 유지하려면 기존 소스 폴더에서 확장 '새로고침'만 해도 됩니다.

## 2. Chrome Web Store에 제출하기

업로드할 파일: **dist/personal-color-remapper-1.1.0-chrome.zip**

- ZIP 루트에 manifest.json이 있습니다.
- 실행 파일 23개만 포함합니다.
- 테스트, npm 의존성, Git, 소스용 README, 스토어 자료는 제외했습니다.
- 공식 안내: https://developer.chrome.com/docs/webstore/prepare

함께 입력/업로드할 자료:

| 항목 | 준비 파일 |
|---|---|
| 제목·간단 설명·상세 설명 | LISTING.md |
| Single purpose·권한 사용 이유 | PRIVACY-DISCLOSURE.md |
| 개인정보 안내문 | privacy.html |
| 128×128 아이콘 | assets/icon-128.png |
| 440×280 프로모션 이미지 | assets/promo-440x280.png |
| 1280×800 실제 Options 화면 | assets/options-1280x800.png |

이미지 규격 출처: https://developer.chrome.com/docs/webstore/images

## 3. 게시자가 직접 완료할 항목

- Chrome Web Store 개발자 계정 등록/인증 및 대시보드 접속
- 개발자 표시 이름, 실제 지원 연락처
- privacy.html을 본인이 관리하는 공개 HTTPS 주소에 게시하고 해당 URL 입력
- 필요 시 홈페이지/지원 URL 입력
- 일반 Chrome의 도구 모음 Popup·최초 권한 승인/거절·native EyeDropper 수동 확인
- 대시보드의 최신 필수 항목 확인 후 제출

이 작업에서는 스토어에 업로드하거나 외부에 게시하지 않았습니다. 실제 계정·연락처·공개 개인정보 URL은 임의로 만들지 않았습니다. 스토어 심사 통과를 보장하는 자료는 아닙니다.

## 4. 소스 수정 후 다시 만들기

프로젝트 루트에서:

```sh
npm run package
```

버전을 올릴 때 manifest.json과 package.json/package-lock.json을 함께 갱신합니다. dist/BUILD-INFO.json에 파일 목록·SHA-256이 생성됩니다. store/는 ZIP과 별도로 대시보드에 제출하는 자료입니다.

이전 루트의 personal-color-remapper-v1.0.0.zip은 개발 파일까지 포함한 구버전입니다. 새 제출에는 dist/의 1.1.0 ZIP을 사용하세요.
