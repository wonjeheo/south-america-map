// js/app.js

// 🔥 [수정됨] clockTargetCity 가져오기 (시계 타겟 확인용)
import { loadCities, setupCityEvents, cityMarkers, clockTargetCity } from "./city.js";
import { loadRoutes, updateTotalSpent, setupRouteEvents, routeLines } from "./route.js";
import { updateTimelineUI } from "./timeline.js";
import { map } from "./map.js";
import { 
  auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, 
  signOut, onAuthStateChanged, getRedirectResult,
  setPersistence, browserLocalPersistence
} from "./firebase.js";

/* ============================================================
   0. 앱 시작 즉시: 로그인 지속성 설정
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
   3. 🕒 시계 기능 (수동 선택 우선 모드)
   - 타임라인 클릭 시 해당 도시 시간 표시
   - 클릭 없으면 오늘 날짜 여행지 시간 표시
============================================================ */
function startClock() {
  const elKorea = document.getElementById("time-korea");
  const elLocal = document.getElementById("time-local");
  
  if (!elKorea || !elLocal) return;

  setInterval(() => {
    const now = new Date();

    // 1. 한국 시간
    const koTime = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: "Asia/Seoul"
    });
    elKorea.textContent = `🇰🇷 한국 ${koTime}`;

    // 2. 현지 시간 계산
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    let targetCity = clockTargetCity; 

    if (!targetCity && cityMarkers) {
      Object.values(cityMarkers).forEach(c => {
        const d = c.data;
        if (d.Stay_in <= todayStr && todayStr <= d.Stay_out) {
          targetCity = d;
        }
      });
    }

    let localDate;
    
    if (targetCity) {
      // ✈️ 여행 중 or 선택됨
      const lng = targetCity.Coords[1]; 
      
      // 원래는 const였지만, 값을 수정해야 하므로 let으로 변경
      let offsetHours = Math.round(lng / 15); 

      // 🔥 [추가됨] 인천(또는 서울)인 경우 강제로 9(UTC+9)로 보정
      if (targetCity.City === "인천" || targetCity.City === "서울") {
        offsetHours = 9;
      }

      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      localDate = new Date(utc + (3600000 * offsetHours));
      
      elLocal.textContent = `📍 ${targetCity.City} ${formatTime(localDate)}`;
      elLocal.style.color = "#d90429"; 

    } else {
      // 🏠 기본값: 한국 시간
      const defaultOffset = 9; 
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      localDate = new Date(utc + (3600000 * defaultOffset));
      
      elLocal.textContent = `🌎 한국 ${formatTime(localDate)}`;
      elLocal.style.color = "#222"; 
    }

  }, 1000);
}

function formatTime(dateObj) {
  let h = dateObj.getHours();
  let m = dateObj.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// 앱 시작 시 시계 가동
startClock();


/* ============================================================
   4. 🔥 로그인 & 게스트 모드 로직
============================================================ */
const loginOverlay = document.getElementById("login-overlay");
const btnLoginGoogle = document.getElementById("btn-login-google");
const btnGuest = document.getElementById("btn-guest");
const btnLogout = document.getElementById("btn-logout");

// 구글 로그인 버튼
btnLoginGoogle.onclick = async () => {
  const provider = new GoogleAuthProvider();

  // 버튼 비활성화 (중복 클릭 방지)
  btnLoginGoogle.disabled = true;
  btnLoginGoogle.innerText = "로그인 중...";

  try {
    console.log("🚀 팝업 로그인 시도...");
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("로그인 실패:", error);
    
    btnLoginGoogle.disabled = false;
    btnLoginGoogle.innerText = "Google 로그인 (관리자)";

    if (error.code === 'auth/popup-blocked') {
      alert("브라우저 팝업 차단이 감지되었습니다. 설정에서 팝업을 허용해주시거나, 다른 브라우저를 사용해주세요.");
    } else if (error.code !== 'auth/cancelled-popup-request') {
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

// 인증 상태 감지
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