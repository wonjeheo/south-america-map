// Firebase Authentication 콘솔에서 확인한 관리자 UID를 입력하세요.
// 여러 관리자를 허용하려면 배열에 UID를 추가하면 됩니다.
export const ADMIN_UIDS = Object.freeze([
  "XPXg4vrl5lRXEkOZVFrybWjJeka2"
]);

export const COLLECTIONS = Object.freeze({
  privateCities: "Cities",
  privateRoutes: "Routes",
  publicCities: "PublicCities",
  publicRoutes: "PublicRoutes"
});

export function isConfiguredAdmin(uid) {
  return Boolean(uid) && ADMIN_UIDS.some(
    configuredUid => configuredUid === uid && !configuredUid.startsWith("REPLACE_WITH_")
  );
}
