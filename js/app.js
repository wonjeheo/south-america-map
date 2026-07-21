import { map } from "./map.js";
import {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "./firebase.js";
import { isConfiguredAdmin } from "./config.js";
import { setAccessMode, getAccessMode, isAdminMode } from "./state.js";
import { cityMarkers, routeLines, uiState } from "./store.js";
import { setupCityEvents, loadCities, clearCities } from "./city.js";
import {
  setupRouteEvents,
  loadRoutes,
  clearRoutes,
  updateTotalSpent
} from "./route.js";
import { updateTimelineUI } from "./timeline.js";
import { publishPublicSnapshot } from "./publish.js";

const loginOverlay = document.getElementById("login-overlay");
const btnLoginGoogle = document.getElementById("btn-login-google");
const btnGuest = document.getElementById("btn-guest");
const btnSession = document.getElementById("btn-session");
const btnPublish = document.getElementById("btn-publish");
const publishStatus = document.getElementById("publish-status");
const privacyNotice = document.getElementById("privacy-notice");
const timelineTitle = document.getElementById("timeline-title");

let guestChosen = false;
let loadedMode = null;
let loadingPromise = null;

function setLoginButtonBusy(isBusy) {
  btnLoginGoogle.disabled = isBusy;
  btnLoginGoogle.textContent = isBusy ? "로그인 중..." : "Google 로그인 (관리자)";
}

function applyModeUI(mode) {
  document.body.classList.remove("locked-mode", "guest-mode", "admin-mode");
  document.body.classList.add(`${mode}-mode`);

  if (mode === "admin") {
    loginOverlay.classList.add("hidden");
    btnSession.classList.remove("hidden");
    btnSession.textContent = "로그아웃";
    privacyNotice.textContent = "관리자 모드: 정확한 일정·숙소·비용을 포함한 비공개 원본을 보고 있습니다.";
    timelineTitle.textContent = "여행 타임라인 · 관리자";
  } else if (mode === "guest") {
    loginOverlay.classList.add("hidden");
    btnSession.classList.remove("hidden");
    btnSession.textContent = "관리자 로그인";
    privacyNotice.textContent = "공개 보기: 방문 도시, 월 단위 시기, 이동 경로와 이동수단만 표시됩니다.";
    timelineTitle.textContent = "여행 타임라인";
  } else {
    loginOverlay.classList.remove("hidden");
    btnSession.classList.add("hidden");
    privacyNotice.textContent = "여행이 종료된 뒤 공개한 요약 지도입니다.";
  }
}

async function loadMode(mode) {
  if (loadingPromise) await loadingPromise;
  if (loadedMode === mode) return;

  loadingPromise = (async () => {
    setAccessMode(mode);
    applyModeUI(mode);
    clearRoutes();
    clearCities();
    publishStatus.textContent = "";

    try {
      await loadCities();
      await loadRoutes();
      updateTotalSpent();
      updateTimelineUI();
      loadedMode = mode;

      if (mode === "guest" && Object.keys(cityMarkers).length === 0) {
        document.getElementById("timeline-empty").textContent =
          "아직 공개된 여행 데이터가 없습니다.";
      }
    } catch (error) {
      console.error(error);
      document.getElementById("timeline-empty").classList.remove("hidden");
      document.getElementById("timeline-empty").textContent =
        mode === "guest"
          ? "공개 지도를 불러오지 못했습니다. Firestore 규칙과 공개 컬렉션을 확인하세요."
          : "관리자 데이터를 불러오지 못했습니다. Firestore 규칙을 확인하세요.";
    }
  })();

  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

setupCityEvents();
setupRouteEvents();
document.addEventListener("travel-data-changed", () => {
  updateTotalSpent();
  updateTimelineUI();
  publishStatus.textContent = "비공개 원본이 변경되었습니다. 게스트 화면에 반영하려면 ‘공개 지도 갱신’을 누르세요.";
});

setPersistence(auth, browserLocalPersistence).catch(error => {
  console.error("로그인 지속성 설정 실패", error);
});

btnLoginGoogle.addEventListener("click", async () => {
  setLoginButtonBusy(true);
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (!["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(error.code)) {
      alert(`로그인에 실패했습니다: ${error.message}`);
    }
  } finally {
    setLoginButtonBusy(false);
  }
});

btnGuest.addEventListener("click", async () => {
  guestChosen = true;
  if (auth.currentUser) await signOut(auth);
  loadedMode = null;
  await loadMode("guest");
});

btnSession.addEventListener("click", async () => {
  if (isAdminMode()) {
    guestChosen = false;
    loadedMode = null;
    await signOut(auth);
    setAccessMode("locked");
    applyModeUI("locked");
  } else {
    guestChosen = false;
    setAccessMode("locked");
    applyModeUI("locked");
  }
});

btnPublish.addEventListener("click", async () => {
  btnPublish.disabled = true;
  publishStatus.textContent = "공개용 데이터를 갱신하는 중입니다...";
  try {
    const result = await publishPublicSnapshot();
    publishStatus.textContent =
      `공개 지도 갱신 완료: 도시 ${result.cityCount}개, 경로 ${result.routeCount}개`;
  } catch (error) {
    publishStatus.textContent = `갱신 실패: ${error.message}`;
  } finally {
    btnPublish.disabled = false;
  }
});

onAuthStateChanged(auth, async user => {
  if (user) {
    guestChosen = false;
    if (isConfiguredAdmin(user.uid)) {
      loadedMode = null;
      await loadMode("admin");
      return;
    }

    const uid = user.uid;
    await signOut(auth);
    setAccessMode("locked");
    applyModeUI("locked");
    alert(
      "이 Google 계정은 관리자로 등록되어 있지 않습니다.\n\n" +
      `Firebase UID: ${uid}\n\n` +
      "이 UID를 js/config.js와 firestore.rules의 관리자 UID 자리에 동일하게 입력하세요."
    );
    return;
  }

  if (!guestChosen && getAccessMode() !== "guest") {
    setAccessMode("locked");
    applyModeUI("locked");
  }
});

document.getElementById("btn-world").addEventListener("click", () => {
  map.flyTo([20, 0], 2.3, { duration: 1.5 });
  map.once("moveend", () => Object.values(routeLines).forEach(route => route.line?.redraw()));
});

document.getElementById("btn-southamerica").addEventListener("click", () => {
  map.flyTo([-10, -65], 4.3, { duration: 1.5 });
  map.once("moveend", () => Object.values(routeLines).forEach(route => route.line?.redraw()));
});

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function startClock() {
  const koreaElement = document.getElementById("time-korea");
  const localElement = document.getElementById("time-local");

  const tick = () => {
    const now = new Date();
    const koreaTime = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul"
    });
    koreaElement.textContent = `🇰🇷 한국 ${koreaTime}`;

    let targetCity = uiState.clockTargetCity;
    if (!targetCity && isAdminMode()) {
      const today = now.toISOString().slice(0, 10);
      targetCity = Object.values(cityMarkers)
        .map(city => city.data)
        .find(city => city.Stay_in && city.Stay_out && city.Stay_in <= today && today <= city.Stay_out);
    }

    if (!targetCity || !Array.isArray(targetCity.Coords)) {
      localElement.textContent = `🌎 한국 ${koreaTime}`;
      return;
    }

    let offsetHours = Math.round(Number(targetCity.Coords[1]) / 15);
    if (["인천", "서울"].includes(targetCity.City)) offsetHours = 9;

    const utcMilliseconds = now.getTime() + now.getTimezoneOffset() * 60_000;
    const localDate = new Date(utcMilliseconds + offsetHours * 3_600_000);
    localElement.textContent = `📍 ${targetCity.City} ${formatTime(localDate)}`;
  };

  tick();
  setInterval(tick, 1000);
}

applyModeUI("locked");
startClock();
