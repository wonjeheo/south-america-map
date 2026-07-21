// Firebase Authentication 콘솔에서 확인한 관리자 UID를 입력하세요.
// 여러 관리자를 허용하려면 배열에 UID를 추가하면 됩니다.
export const ADMIN_UIDS = Object.freeze([
  "REPLACE_WITH_YOUR_FIREBASE_AUTH_UID"
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
