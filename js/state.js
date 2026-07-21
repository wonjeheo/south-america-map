let accessMode = "locked";

export function setAccessMode(mode) {
  if (!["locked", "guest", "admin"].includes(mode)) {
    throw new Error(`지원하지 않는 접근 모드입니다: ${mode}`);
  }
  accessMode = mode;
}

export function getAccessMode() {
  return accessMode;
}

export function isAdminMode() {
  return accessMode === "admin";
}

export function requireAdminMode() {
  if (!isAdminMode()) {
    throw new Error("관리자 권한이 필요한 작업입니다.");
  }
}
