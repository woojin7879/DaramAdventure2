# 데스크톱 배포

GitHub Releases에서 맥용 DMG 또는 Windows x64 설치 EXE를 받는다. 사용자는 Node.js나 별도 서버를 설치하지 않는다. Apple Silicon은 `mac-arm64`, Windows는 `win-x64` 파일을 선택한다. Intel Mac 배포는 제공하지 않는다.

현재 테스트 배포는 개발자 인증서 서명/Apple 공증을 하지 않았다. 운영체제에서 확인되지 않은 개발자 경고가 나올 수 있다. 정식 배포 전 인증서 서명과 공증이 필요하다.

Electron은 번들 내부 `dist/`를 `daram://game/` 고정 주소로 제공한다. 인터넷 없이 플레이하며, 저장은 앱 사용자 데이터에 유지된다. 브라우저 저장과 데스크톱 저장은 별개다. 외부 이동과 새 창은 차단하고 Node 접근 없이 격리된 렌더러에서 게임을 실행한다.

개발: `npm ci`, `npm run desktop`. 설치 파일: `npm run desktop:build`. 결과는 Git에서 제외한 `release/`에 생성한다. 맥·윈도우는 각 OS에서 빌드한다.

배포 절차: package.json 버전/lockfile 갱신 → 테스트 → 커밋 → `v*` 태그 푸시 직후 해당 태그의 GitHub 사전 릴리스 생성. `Desktop release` 작업이 Mac ARM64, Windows x64에서 각각 테스트·빌드 후 릴리스에 첨부한다. 수동 실행은 Actions 아티팩트만 남긴다. 출시 상태 변경은 두 플랫폼 빌드와 실제 실행 확인 후 진행한다.
