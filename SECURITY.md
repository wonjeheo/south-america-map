# Security Notes

- `Cities`와 `Routes`에는 민감 정보가 있으므로 공개 읽기 권한을 부여하지 마세요.
- 관리자 UID는 `js/config.js`와 `firestore.rules`에 동일하게 설정해야 합니다.
- 화면에서 버튼을 숨기는 것은 보안 경계가 아닙니다. 최종 접근 제어는 `firestore.rules`가 담당합니다.
- 게스트 공개 범위를 바꿀 때는 `js/publish.js`의 공개 스키마와 `firestore.rules`의 검증 규칙을 함께 수정하세요.
- Firebase 프로젝트의 Google 로그인 Authorized domains와 API key HTTP referrer 제한을 실제 배포 도메인에 맞게 유지하세요.
