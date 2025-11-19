// js/app.js

import { loadCities, setupCityEvents } from "./city.js";
import { loadRoutes, updateTotalSpent, setupRouteEvents } from "./route.js";
import { updateTimelineUI } from "./timeline.js";
import { map } from "./map.js";
import { routeLines } from "./route.js";
import { 
  auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, 
  signOut, onAuthStateChanged, getRedirectResult,
  setPersistence, browserLocalPersistence
} from "./firebase.js";

/* ============================================================
   0. 앱 시작 즉시: 로그인 지속성 설정
   (버튼 클릭 안에 넣으면 팝업이 막히므로, 여기서 미리 실행합니다)
============================================================ */
(async function initAuthPersistence() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log("💾 로그인 지속성 설정 완료");
  } catch (error) {
    console.error("지속성 설정 실패:", error);
  }
})();


/* ============================================================
   1. 데이터 로드 및 초기화
============================================================ */
setupCityEvents();
setupRouteEvents();

loadCities().then(() => {
  loadRoutes().then(() => {
    updateTotalSpent();
    updateTimelineUI();
  });
});

/* ============================================================
   2. 맵 컨트롤
============================================================ */
document.getElementById("btn-world").onclick = () => {
  map.flyTo([20, 0], 2.3, { duration: 1.5 });
  map.once("moveend", () => Object.values(routeLines).forEach(r => r.line?.redraw()));
};

document.getElementById("btn-southamerica").onclick = () => {
  map.flyTo([-10, -65], 4.3, { duration: 1.5 });
  map.once("moveend", () => Object.values(routeLines).forEach(r => r.line?.redraw()));
};

document.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("touchstart", e => {
    e.stopPropagation();
    btn.click();
  });
});


/* ============================================================
   3. 🔥 로그인 & 게스트 모드 로직
   (모바일/PC 구분 없이 무조건 팝업을 사용합니다)
============================================================ */
const loginOverlay = document.getElementById("login-overlay");
const btnLoginGoogle = document.getElementById("btn-login-google");
const btnGuest = document.getElementById("btn-guest");
const btnLogout = document.getElementById("btn-logout");

// [수정] 구글 로그인 버튼
btnLoginGoogle.onclick = async () => {
  const provider = new GoogleAuthProvider();

  // 버튼 비활성화 (중복 클릭 방지)
  btnLoginGoogle.disabled = true;
  btnLoginGoogle.innerText = "로그인 중...";

  try {
    // 🚀 핵심: 모바일이든 PC든 묻지도 따지지도 않고 '팝업'을 띄웁니다.
    // localhost에서 리다이렉트는 데이터가 유실되므로 사용하지 않습니다.
    console.log("🚀 팝업 로그인 시도...");
    await signInWithPopup(auth, provider);
    
    // 성공하면 onAuthStateChanged가 알아서 처리함

  } catch (error) {
    console.error("로그인 실패:", error);
    
    btnLoginGoogle.disabled = false;
    btnLoginGoogle.innerText = "Google 로그인 (관리자)";

    // 만약 진짜로 팝업이 막혔다면 (아주 드문 경우)
    if (error.code === 'auth/popup-blocked') {
      alert("브라우저 팝업 차단이 감지되었습니다. 설정에서 팝업을 허용해주시거나, 다른 브라우저를 사용해주세요.");
      // 여기서 리다이렉트를 시도하지 않습니다. (어차피 localhost에선 안 되니까요)
    } else if (error.code === 'auth/cancelled-popup-request') {
      // 사용자가 닫음 -> 무시
    } else {
      alert("로그인 에러: " + error.message);
    }
  }
};

// 게스트 모드
btnGuest.onclick = () => {
  loginOverlay.classList.add("hidden"); 
  document.body.classList.add("guest-mode"); 
  btnLogout.classList.add("hidden"); 
};

// 로그아웃
btnLogout.onclick = () => {
  signOut(auth).then(() => {
    alert("로그아웃 되었습니다.");
    location.reload(); 
  });
};

// [핵심] 인증 상태 감지
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("🎉 로그인 성공:", user.email);
    
    loginOverlay.classList.add("hidden");     
    document.body.classList.remove("guest-mode"); 
    btnLogout.classList.remove("hidden");     

    btnLoginGoogle.disabled = false;
    btnLoginGoogle.innerText = "Google 로그인 (관리자)";
  } else {
    console.log("🔒 로그아웃 상태");
  }
});