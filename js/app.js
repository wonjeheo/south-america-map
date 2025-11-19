// 1. 모든 import를 맨 위로 모읍니다.
import { loadCities, setupCityEvents } from "./city.js";
import { loadRoutes, updateTotalSpent, setupRouteEvents } from "./route.js";
import { updateTimelineUI } from "./timeline.js";
import { map } from "./map.js";
import { routeLines } from "./route.js";

// 🔥 인증 관련 import도 위로 올림
import { auth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "./firebase.js";

// 2. 앱 초기화 로직 실행
setupCityEvents();
setupRouteEvents();

loadCities().then(() => {
  loadRoutes().then(() => {
    updateTotalSpent();
    updateTimelineUI();
  });
});

// 3. 맵 버튼 이벤트
document.getElementById("btn-world").onclick = () => {
  map.flyTo([20, 0], 2.3, { duration: 1.5 });
  map.once("moveend", () => {
    Object.values(routeLines).forEach(r => { if (r.line?.redraw) r.line.redraw(); });
  });
};

document.getElementById("btn-southamerica").onclick = () => {
  map.flyTo([-10, -65], 4.3, { duration: 1.5 });
  map.once("moveend", () => {
    Object.values(routeLines).forEach(r => { if (r.line?.redraw) r.line.redraw(); });
  });
};

document.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("touchstart", e => {
    e.stopPropagation();
    btn.click();
  });
});

// 4. 🔥 로그인/로그아웃 로직
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const userDisplay = document.getElementById("user-display");

// 로그인 버튼
btnLogin.onclick = async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login Failed", error);
    alert("로그인 실패: " + error.message);
  }
};

// 로그아웃 버튼
btnLogout.onclick = () => signOut(auth);

// 상태 감지
onAuthStateChanged(auth, (user) => {
  if (user) {
    btnLogin.classList.add("hidden");
    btnLogout.classList.remove("hidden");
    userDisplay.textContent = `${user.displayName}님 환영합니다!`;
    console.log("현재 사용자:", user.email);
  } else {
    btnLogin.classList.remove("hidden");
    btnLogout.classList.add("hidden");
    userDisplay.textContent = "";
  }
});