# South America Travel Map — Secure Guest/Admin Edition

남미 여행 경로를 가족이나 지인에게 보여주되, 정확한 일정·숙소·비용·메모는 관리자에게만 공개하도록 분리한 버전입니다.

## 공개 범위

### 게스트가 읽는 데이터

- 방문 도시 이름과 지도 좌표
- 월 단위 방문 시기 (`YYYY-MM`)
- 도시 방문 순서
- 도시 간 이동 경로와 이동수단

게스트 브라우저는 `PublicCities`, `PublicRoutes`만 읽습니다.

### 관리자만 읽는 데이터

- 정확한 `DATE IN`, `DATE OUT`
- 호텔명
- 도시별 지출 내역과 총비용
- 노선 비용과 메모
- 도시·노선 추가, 수정, 삭제

관리자 브라우저는 기존 `Cities`, `Routes`를 읽습니다.

## 최초 설정

### 1. 관리자 UID 등록

Firebase Console → **Authentication → Users**에서 본인 Google 계정의 UID를 확인합니다.

다음 두 파일의 값을 **동일한 UID**로 바꿉니다.

- `js/config.js`
- `firestore.rules`

```text
REPLACE_WITH_YOUR_FIREBASE_AUTH_UID
```

UID를 모르는 상태에서 관리자 로그인을 시도하면 화면에 해당 계정의 UID가 표시됩니다. UID를 코드에 등록하기 전에는 어떤 Google 계정도 관리자 권한을 얻지 못합니다.

### 2. Firebase Authentication 설정

Firebase Console에서 다음을 확인합니다.

- Authentication의 Google 공급자 활성화
- Authorized domains에 실제 배포 도메인 등록
- GitHub Pages 사용 시 `wonjeheo.github.io` 등록

### 3. Firestore Rules 배포

Firebase CLI 로그인 후 프로젝트 루트에서 실행합니다.

```bash
firebase deploy --only firestore:rules
```

배포 전에 `firestore.rules`의 관리자 UID가 정확한지 확인하세요.

### 4. 웹사이트 배포

정적 파일 전체를 GitHub Pages 또는 Firebase Hosting에 배포합니다. 기존 Firebase 프로젝트 설정은 `js/firebase.js`에 유지되어 있습니다.

### 5. 공개용 데이터 최초 생성

1. 배포된 사이트에서 등록한 Google 계정으로 관리자 로그인
2. 화면 왼쪽 아래의 **공개 지도 갱신** 클릭
3. `PublicCities`, `PublicRoutes`가 자동 생성되는지 Firebase Console에서 확인
4. 로그아웃 후 게스트 화면 확인

관리자 원본을 수정한 뒤에는 공개 데이터가 자동으로 바뀌지 않습니다. 검토 후 **공개 지도 갱신**을 눌러야 게스트 화면에 반영됩니다.

## 기존 데이터 호환

기존 `Cities`, `Routes` 컬렉션은 그대로 사용합니다.

- 새로 저장되는 도시에는 `Hotel`이 포함됩니다.
- 새로 저장되는 경로에는 도시 문서 ID인 `FromId`, `ToId`가 추가됩니다.
- 기존 경로에 ID가 없어도 도시 이름으로 연결한 뒤 공개 데이터를 만들 때 ID를 보완합니다.

기존 노선의 `Cost`가 문자열로 저장되어 있어 수정 시 권한 오류가 발생한다면, 관리자 화면에서 비용을 숫자로 다시 입력해 저장하세요. 새 버전은 비용을 숫자로 저장합니다.

## 적용된 보안 조치

- 로그인 여부가 아닌 등록된 Firebase UID로 관리자 판별
- Firestore Rules에서 비공개 컬렉션 읽기·쓰기를 관리자에게만 허용
- 게스트용 공개 컬렉션과 관리자 원본 컬렉션 분리
- CSS로 숨긴 데이터가 아니라, DB 단계에서 민감 필드 자체를 게스트에게 전달하지 않음
- 사용자 입력을 `innerHTML`에 삽입하지 않아 저장형 XSS 위험 완화
- 존재하지 않는 도시를 참조하는 노선을 페이지 조회 중 자동 삭제하지 않음
- 도시·날짜·좌표·비용·문자열 길이 검증
- Leaflet CDN 파일에 Subresource Integrity 적용
- Content Security Policy 적용
- 외부 마커 이미지를 프로젝트 내부 SVG로 교체
- 공개 데이터 갱신을 관리자가 명시적으로 수행

## 추가 권장 설정

### Google Cloud API Key 제한

Firebase 웹 API 키는 비밀키가 아니지만 남용 방지를 위해 Google Cloud Console에서 HTTP referrer를 실제 도메인으로 제한하는 것이 좋습니다.

예시:

```text
https://wonjeheo.github.io/*
http://localhost:*
```

운영 환경에서는 localhost 항목을 제거할 수 있습니다. 제한 적용 후 로그인과 Firestore 읽기가 정상 동작하는지 확인하세요.

### Firebase App Check

공개 Firestore 읽기 요청의 자동화 남용을 더 줄이려면 Firebase App Check를 추가할 수 있습니다. 현재 버전은 관리자 권한과 민감 정보 보호를 Firestore Rules로 보장하며, App Check는 추가적인 남용 방지 계층입니다.

## 로컬 실행

ES Module과 Firebase Auth를 사용하므로 파일을 직접 더블클릭하지 말고 로컬 HTTP 서버를 사용합니다.

```bash
python -m http.server 8000
```

브라우저에서 `http://localhost:8000`으로 접속합니다. Google 로그인까지 테스트하려면 Firebase Authorized domains 설정도 확인해야 합니다.
