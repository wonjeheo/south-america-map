// js/city.js
import { map, iconRed } from "./map.js";
import {
  db, collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, getDocs
} from "./firebase.js";
import { updateTotalSpent } from "./route.js";
import { updateTimelineUI } from "./timeline.js";
import { routeLines } from "./route.js";

export const cityMarkers = {};
export let selectedCity = null;

/* ============================
   🔥 [추가됨] 시계 타겟 도시 설정
   (timeline.js에서 호출하여, 시계의 기준 도시를 바꿈)
============================ */
export let clockTargetCity = null;
export function setClockTargetCity(c) {
  clockTargetCity = c;
}

let connectMode = false;
let connectFromCityId = null;

// Add-city mode
let isAddCityMode = false;
let addCityPos = null;

// Elements
const modalCity = document.getElementById("modal-city");
const modalRoute = document.getElementById("modal-route");

const overlay = document.getElementById("add-city-overlay");

/* ============================
   Helper: Hide overlay
============================ */
function hideOverlay() {
  overlay.classList.remove("visible");
  overlay.classList.add("hidden");
}

/* ============================
   Helper: Show overlay
============================ */
function showOverlay() {
  overlay.classList.remove("hidden");
  overlay.classList.add("visible");
}


/* ============================
   지출 계산
============================ */
function updateCitySpentPreview() {
  const rows = document.querySelectorAll("#spent-list div");
  let total = 0;
  rows.forEach(r => total += Number(r.querySelector(".spent-cost").value || 0));
  document.getElementById("city-spent-total").textContent =
    `도시 지출 총합: ${total.toLocaleString()}원`;
}

function collectSpentList() {
  const rows = document.querySelectorAll("#spent-list div");
  const arr = [];
  rows.forEach(r => {
    const title = r.querySelector(".spent-title").value;
    const cost = r.querySelector(".spent-cost").value;
    if (title.trim() !== "" || cost.trim() !== "") {
      arr.push({ title, cost: Number(cost || 0) });
    }
  });
  return arr;
}


/* ============================
   Marker 생성
============================ */
export function createCityMarker(id, c) {
  const marker = L.marker(c.Coords, { icon: iconRed }).addTo(map);

  cityMarkers[id] = { id, data: c, marker };

  marker.on("click", () => {
    if (connectMode) {
      if (id === connectFromCityId) return;
      window.routeFrom = connectFromCityId;
      window.routeTo = id;

      document.getElementById("route-transport").value = "비행기";
      document.getElementById("route-cost").value = "";
      document.getElementById("route-note").value = "";

      modalRoute.classList.remove("hidden");
      connectMode = false;
      return;
    }

    selectedCity = id;

    document.getElementById("city-name").value = c.City;
    document.getElementById("city-in").value = c.Stay_in;
    document.getElementById("city-out").value = c.Stay_out;

    const spentList = document.getElementById("spent-list");
    spentList.innerHTML = "";

    if (c.Spent) {
      c.Spent.forEach(s => {
        const row = document.createElement("div");
        row.innerHTML = `
          <input type="text" class="spent-title" value="${s.title}">
          <input type="number" class="spent-cost" value="${s.cost}">
          <button class="spent-remove">X</button>
        `;
        row.querySelector(".spent-remove").onclick = () => row.remove();
        row.querySelector(".spent-cost").oninput = updateCitySpentPreview;
        row.querySelector(".spent-title").oninput = updateCitySpentPreview;
        spentList.appendChild(row);
      });
    }

    updateCitySpentPreview();
    modalCity.classList.remove("hidden");
  });
}


/* ============================
   DB Load
============================ */
export async function loadCities() {
  const snap = await getDocs(collection(db, "Cities"));
  snap.forEach(d => {
    const c = d.data();
    createCityMarker(d.id, {
      City: c.City,
      Coords: c.Coords,
      Stay_in: c.Stay_in,
      Stay_out: c.Stay_out,
      Spent: c.Spent || []
    });
  });
}


/* ============================
   이벤트 설정
============================ */
export function setupCityEvents() {

  /* ------------------------------------
     🔥 도시 추가 버튼 → Overlay 표시
  ------------------------------------ */
  document.getElementById("add-city-mobile").onclick = () => {
    isAddCityMode = true;
    showOverlay();
  };


  /* ------------------------------------
     🔥 Longpress(모바일+PC) → Add-city 모드
  ------------------------------------ */
  let pressTimer = null;

  map.on("mousedown touchstart", () => {
    if (isAddCityMode) return;

    pressTimer = setTimeout(() => {
      isAddCityMode = true;
      showOverlay();
    }, 600); // 600ms longpress
  });

  map.on("mouseup touchend", () => {
    clearTimeout(pressTimer);
  });


  /* ------------------------------------
     🔥 지도 클릭 → 좌표 선택 후 modal 열림
  ------------------------------------ */
  map.on("click", (e) => {
    if (!isAddCityMode) return;

    addCityPos = [e.latlng.lat, e.latlng.lng];

    hideOverlay();

    selectedCity = null;
    document.getElementById("city-name").value = "";
    document.getElementById("city-in").value = "";
    document.getElementById("city-out").value = "";
    document.getElementById("spent-list").innerHTML = "";

    updateCitySpentPreview();
    modalCity.classList.remove("hidden");

    isAddCityMode = false;
  });


  /* ------------------------------------
     도시 저장
  ------------------------------------ */
  document.getElementById("city-save").onclick = async () => {
    const name = document.getElementById("city-name").value;
    const stayIn = document.getElementById("city-in").value;
    const stayOut = document.getElementById("city-out").value;
    const spentArr = collectSpentList();

    if (!selectedCity) {
      if (!addCityPos) return;

      const ref = await addDoc(collection(db, "Cities"), {
        City: name,
        Coords: addCityPos,
        Stay_in: stayIn,
        Stay_out: stayOut,
        Spent: spentArr
      });

      createCityMarker(ref.id, {
        City: name,
        Coords: addCityPos,
        Stay_in: stayIn,
        Stay_out: stayOut,
        Spent: spentArr
      });

    } else {
      const c = cityMarkers[selectedCity];
      if (!c) return;

      await updateDoc(doc(db, "Cities", selectedCity), {
        City: name,
        Stay_in: stayIn,
        Stay_out: stayOut,
        Spent: spentArr
      });

      c.data.City = name;
      c.data.Stay_in = stayIn;
      c.data.Stay_out = stayOut;
      c.data.Spent = spentArr;
    }

    modalCity.classList.add("hidden");
    updateTotalSpent();
    updateTimelineUI();
  };


  /* ------------------------------------
     도시 삭제 (안전 체크 포함)
  ------------------------------------ */
  document.getElementById("city-delete").onclick = async () => {
    if (!selectedCity || !cityMarkers[selectedCity]) {
      modalCity.classList.add("hidden");
      return;
    }

    const cityName = cityMarkers[selectedCity].data.City;

    const qFrom = query(collection(db, "Routes"), where("From", "==", cityName));
    const qTo   = query(collection(db, "Routes"), where("To", "==", cityName));

    const fromSnap = await getDocs(qFrom);
    const toSnap   = await getDocs(qTo);

    for (let d of [...fromSnap.docs, ...toSnap.docs]) {
      const routeId = d.id;
      if (routeLines[routeId]) {
        map.removeLayer(routeLines[routeId].line);
        if (routeLines[routeId].numberMarker)
          map.removeLayer(routeLines[routeId].numberMarker);
        delete routeLines[routeId];
      }
      await deleteDoc(doc(db, "Routes", routeId));
    }

    map.removeLayer(cityMarkers[selectedCity].marker);
    delete cityMarkers[selectedCity];
    await deleteDoc(doc(db, "Cities", selectedCity));

    modalCity.classList.add("hidden");
    updateTotalSpent();
    updateTimelineUI();
  };


  /* ------------------------------------
     연결 모드
  ------------------------------------ */
  document.getElementById("city-connect").onclick = () => {
    connectMode = true;
    connectFromCityId = selectedCity;
    modalCity.classList.add("hidden");
  };

  document.getElementById("city-cancel").onclick = () => {
    modalCity.classList.add("hidden");
  };


  /* ------------------------------------
     지출 항목 추가
  ------------------------------------ */
  const addSpentBtn = document.getElementById("add-spent-item");

  function addSpentRow() {
    const row = document.createElement("div");
    row.innerHTML = `
      <input type="text" class="spent-title" placeholder="내용">
      <input type="number" class="spent-cost" placeholder="금액">
      <button class="spent-remove">X</button>
    `;
    row.querySelector(".spent-remove").onclick = () => row.remove();
    row.querySelector(".spent-cost").oninput = updateCitySpentPreview;
    row.querySelector(".spent-title").oninput = updateCitySpentPreview;

    document.getElementById("spent-list").appendChild(row);
    updateCitySpentPreview();
  }

  addSpentBtn.addEventListener("click", addSpentRow);
}


// ============================
// 🔥 줌 레벨에 따라 마커 크기 조절
// ============================
map.on("zoomend", () => {
  const zoom = map.getZoom();

  // 줌 레벨에 따른 스케일 (원하면 변경 가능)
  const scale = Math.max(0.5, Math.min(zoom / 6, 2)); 
  // zoom 6일 때 scale=1(기본 크기), zoom 10이면 scale≈1.66, zoom 3이면 scale=0.5

  Object.values(cityMarkers).forEach(city => {
    const baseSize = 40;  // iconRed의 기본 사이즈
    const newSize = baseSize * scale;

    const newIcon = L.icon({
      iconUrl: city.marker.options.icon.options.iconUrl,
      iconSize: [newSize, newSize],
      iconAnchor: [newSize / 2, newSize],
    });

    city.marker.setIcon(newIcon);
  });
});