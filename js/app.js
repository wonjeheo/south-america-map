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
import { cityMarkers } from "./city.js";
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

function startClock() {
  const elKorea = document.getElementById("time-korea");
  const elLocal = document.getElementById("time-local");

  setInterval(() => {
    const now = new Date();

    // 1. 한국 시간
    const koTime = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: "Asia/Seoul"
    });
    elKorea.textContent = `🇰🇷 한국 ${koTime}`;

    // 2. 현지 시간 계산
    // 현재 날짜(YYYY-MM-DD) 구하기
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`; // 예: "2025-11-24"

    let targetCity = null;

    // cityMarkers를 순회하며 오늘 날짜가 여행 기간(Stay_in ~ Stay_out)에 속하는지 확인
    Object.values(cityMarkers).forEach(c => {
      const d = c.data;
      if (d.Stay_in <= todayStr && todayStr <= d.Stay_out) {
        targetCity = d;
      }
    });

    let localDate;
    
    if (targetCity) {
      // 🔥 여행 중인 도시를 찾음 -> 해당 도시의 경도(Longitude)로 시간대 계산
      const lng = targetCity.Coords[1]; // [lat, lng]
      // 경도 15도마다 1시간 차이 (동쪽 +, 서쪽 -)
      const offsetHours = Math.round(lng / 15); 
      
      // UTC 시간 구하기
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      // 도시 시간 = UTC + (offset * 1시간)
      localDate = new Date(utc + (3600000 * offsetHours));
      
      elLocal.textContent = `📍 ${targetCity.City} ${formatTime(localDate)}`;
      elLocal.style.color = "#d90429"; // 여행 중일 땐 붉은색 강조

    } else {
      // 🏳️ 여행 기간이 아니거나 도시를 못 찾음 -> 기본 남미 시간(페루/콜롬비아 UTC-5)
      // (원하시면 UTC-3 아르헨티나/브라질 기준으로 변경 가능: offset -3)
      const defaultOffset = -5; 
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      localDate = new Date(utc + (3600000 * defaultOffset));
      
      elLocal.textContent = `🌎 현지 ${formatTime(localDate)}`;
      elLocal.style.color = "#222"; // 평소엔 검은색
    }

  }, 1000); // 1초마다 갱신
}

// 00:00 포맷 헬퍼 함수
function formatTime(dateObj) {
  let h = dateObj.getHours();
  let m = dateObj.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// 앱 시작 시 시계 가동
startClock();


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