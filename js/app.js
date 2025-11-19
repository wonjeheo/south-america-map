// js/app.js (전체 덮어쓰기 하세요)

import { loadCities, setupCityEvents } from "./city.js";
import { loadRoutes, updateTotalSpent, setupRouteEvents } from "./route.js";
import { updateTimelineUI } from "./timeline.js";
import { map } from "./map.js";
import { routeLines } from "./route.js";
import { auth, GoogleAuthProvider, signInWithRedirect, signOut, onAuthStateChanged } from "./firebase.js";

// 앱 초기화
setupCityEvents();
setupRouteEvents();

loadCities().then(() => {
  loadRoutes().then(() => {
    updateTotalSpent();
    updateTimelineUI();
  });
});

// 맵 이동 버튼 이벤트
document.getElementById("btn-world").onclick = () => {
  map.flyTo([20, 0], 2.3, { duration: 1.5 });
  map.once("moveend", () => Object.values(routeLines).forEach(r => r.line?.redraw()));
};

document.getElementById("btn-southamerica").onclick = () => {
  map.flyTo([-10, -65], 4.3, { duration: 1.5 });
  map.once("moveend", () => Object.values(routeLines).forEach(r => r.line?.redraw()));
};

// 모바일 터치 버그 수정
document.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("touchstart", e => {
    e.stopPropagation();
    btn.click();
  });
});


/* ============================================================
   🔥 로그인 & 게스트 모드 로직 (핵심 변경)
============================================================ */
const loginOverlay = document.getElementById("login-overlay");
const btnLoginGoogle = document.getElementById("btn-login-google");
const btnGuest = document.getElementById("btn-guest");
const btnLogout = document.getElementById("btn-logout");

// 1. 구글 로그인 버튼 클릭
btnLoginGoogle.onclick = async () => {
  const provider = new GoogleAuthProvider();
  try {
    // 팝업 대신 페이지를 이동시킵니다.
    // (이동하기 때문에 await가 끝나기를 기다릴 필요 없이 바로 페이지가 넘어갑니다)
    await signInWithRedirect(auth, provider); 
  } catch (error) {
    alert("로그인 페이지 이동 실패: " + error.message);
  }
};

// 2. 게스트 입장 버튼 클릭
btnGuest.onclick = () => {
  loginOverlay.classList.add("hidden"); // 인트로 숨김
  document.body.classList.add("guest-mode"); // 게스트 모드 활성화 (수정 버튼 숨김)
  btnLogout.classList.add("hidden"); // 게스트는 로그아웃 버튼 필요 없음
};

// 3. 로그아웃 버튼
btnLogout.onclick = () => {
  signOut(auth).then(() => {
    alert("로그아웃 되었습니다.");
    location.reload(); // 화면 새로고침해서 다시 인트로로
  });
};

// 4. 인증 상태 감지 (자동 로그인 처리)
onAuthStateChanged(auth, (user) => {
  if (user) {
    // --- 로그인 된 상태 (관리자) ---
    console.log("관리자 접속:", user.email);
    
    loginOverlay.classList.add("hidden");     // 인트로 숨김
    document.body.classList.remove("guest-mode"); // 게스트 모드 해제 (모든 버튼 보임)
    btnLogout.classList.remove("hidden");     // 로그아웃 버튼 표시

  } else {
    // --- 로그아웃 된 상태 ---
    // (아무것도 안 함. 사용자가 버튼을 눌러서 결정하도록 대기)
  }
});