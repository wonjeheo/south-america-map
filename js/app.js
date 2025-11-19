// js/app.js

import { loadCities, setupCityEvents } from "./city.js";
import { loadRoutes, updateTotalSpent, setupRouteEvents } from "./route.js";
import { updateTimelineUI } from "./timeline.js";
import { map } from "./map.js";
import { routeLines } from "./route.js";
// 🔥 import에 getRedirectResult 추가
import { auth, GoogleAuthProvider, signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } from "./firebase.js";

setupCityEvents();
setupRouteEvents();

loadCities().then(() => {
  loadRoutes().then(() => {
    updateTotalSpent();
    updateTimelineUI();
  });
});

// ... (맵 이동 버튼 이벤트 코드는 그대로 유지) ...
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
   🔥 로그인 로직 (getRedirectResult 추가)
============================================================ */
const loginOverlay = document.getElementById("login-overlay");
const btnLoginGoogle = document.getElementById("btn-login-google");
const btnGuest = document.getElementById("btn-guest");
const btnLogout = document.getElementById("btn-logout");

// ⭐ [핵심 추가] 리다이렉트 후 돌아왔을 때 결과 확인
// (이 코드가 없으면 에러가 나도 조용히 넘어가서 로그인이 안 된 것처럼 보임)
getRedirectResult(auth)
  .then((result) => {
    if (result) {
      console.log("로그인 성공(리다이렉트 복귀):", result.user);
      // 성공하면 아래 onAuthStateChanged가 자동으로 실행되어 화면을 바꿔줍니다.
    }
  })
  .catch((error) => {
    console.error("로그인 에러:", error);
    alert("로그인 실패: " + error.message); 
    // 👆 에러가 뜨면 메시지를 캡쳐해서 보여주세요!
  });


// 1. 구글 로그인 버튼 클릭
btnLoginGoogle.onclick = async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithRedirect(auth, provider); 
  } catch (error) {
    alert("페이지 이동 실패: " + error.message);
  }
};

// 2. 게스트 입장
btnGuest.onclick = () => {
  loginOverlay.classList.add("hidden");
  document.body.classList.add("guest-mode");
  btnLogout.classList.add("hidden");
};

// 3. 로그아웃
btnLogout.onclick = () => {
  signOut(auth).then(() => {
    alert("로그아웃 되었습니다.");
    location.reload(); 
  });
};

// 4. 상태 감지
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("현재 사용자(AuthChanged):", user.email);
    
    loginOverlay.classList.add("hidden");
    document.body.classList.remove("guest-mode");
    btnLogout.classList.remove("hidden");
  }
});