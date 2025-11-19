// --- REFACTORED city.js (spent box fix + unified events) ---
// 모든 기능을 하나의 setupCityEvents()로 통합한 안정 버전

import { map, iconRed } from "./map.js";
import {
  db, collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, getDocs
} from "./firebase.js";
import { createRouteLine, updateTotalSpent } from "./route.js";
import { updateTimelineUI } from "./timeline.js";
import { routeLines } from "./route.js";

export const cityMarkers = {};
export let selectedCity = null;

let longPressTimer = null;
let longPressPos = null;
let connectMode = false;
let connectFromCityId = null;

// ⭐ 마우스 프리뷰 라인Q
let previewLine = null;

const modalCity = document.getElementById("modal-city");
const modalRoute = document.getElementById("modal-route");

/* ================================Q
   지출 목록 계산
================================ */
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

/* ================================
   Marker 생성
================================ */
export function createCityMarker(id, c) {
  const marker = L.marker(c.Coords, { icon: iconRed }).addTo(map);

  cityMarkers[id] = { id, data: c, marker };

  marker.on("click", () => {
    /* ---- 연결 모드일 때 ---- */
    if (connectMode) {
      if (id === connectFromCityId) return;

      if (previewLine) {
        map.removeLayer(previewLine);
        previewLine = null;
      }

      window.routeFrom = connectFromCityId;
      window.routeTo = id;

      document.getElementById("route-transport").value = "비행기";
      document.getElementById("route-cost").value = "";
      document.getElementById("route-note").value = "";

      modalRoute.classList.remove("hidden");
      connectMode = false;
      return;
    }

    /* ---- 일반 도시 클릭 ---- */
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

/* ================================
   DB Load
================================ */
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

/* ================================
   이벤트 설정 (통합 버전)
================================ */
export function setupCityEvents() {

  /* ---- 롱프레스 → 도시 생성 ---- */
  map.on("mousedown", e => {
    longPressPos = [e.latlng.lat, e.latlng.lng];
    longPressTimer = setTimeout(() => {
      selectedCity = null;
      document.getElementById("city-name").value = "";
      document.getElementById("city-in").value = "";
      document.getElementById("city-out").value = "";
      document.getElementById("spent-list").innerHTML = "";
      updateCitySpentPreview();
      modalCity.classList.remove("hidden");
    }, 2000);
  });

  map.on("mouseup", () => clearTimeout(longPressTimer));
let touchStartPoint = null;
let touchMoved = false;

map.on("touchstart", (e) => {
  const t = e.touches?.[0];
  if (!t) return;

  const pos = map.mouseEventToLatLng(t);
  if (!pos) return;

  touchMoved = false;
  longPressPos = [pos.lat, pos.lng];

  longPressTimer = setTimeout(() => {
    if (!touchMoved) {
      selectedCity = null;
      document.getElementById("city-name").value = "";
      document.getElementById("city-in").value = "";
      document.getElementById("city-out").value = "";
      document.getElementById("spent-list").innerHTML = "";
      updateCitySpentPreview();
      modalCity.classList.remove("hidden");
    }
  }, 1200);   // 모바일은 너무 길면 안 됨
});

map.on("touchmove", () => {
  touchMoved = true;
  clearTimeout(longPressTimer);
});

map.on("touchend", () => {
  clearTimeout(longPressTimer);
});
  /* ---- 도시 저장 ---- */
  document.getElementById("city-save").onclick = async () => {
    const name = document.getElementById("city-name").value;
    const stayIn = document.getElementById("city-in").value;
    const stayOut = document.getElementById("city-out").value;
    const spentArr = collectSpentList();

    if (!selectedCity) {
      /* 신규 */
      const ref = await addDoc(collection(db, "Cities"), {
        City: name,
        Coords: longPressPos,
        Stay_in: stayIn,
        Stay_out: stayOut,
        Spent: spentArr
      });

      createCityMarker(ref.id, {
        City: name,
        Coords: longPressPos,
        Stay_in: stayIn,
        Stay_out: stayOut,
        Spent: spentArr
      });

    } else {
      /* 수정 */
      await updateDoc(doc(db, "Cities", selectedCity), {
        City: name,
        Stay_in: stayIn,
        Stay_out: stayOut,
        Spent: spentArr
      });

      const c = cityMarkers[selectedCity].data;
      c.City = name;
      c.Stay_in = stayIn;
      c.Stay_out = stayOut;
      c.Spent = spentArr;
    }

    modalCity.classList.add("hidden");
    updateTotalSpent();
    updateTimelineUI();
  };

  /* ---- 도시 삭제 ---- */
  document.getElementById("city-delete").onclick = async () => {
    if (!selectedCity) return;

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

    await deleteDoc(doc(db, "Cities", selectedCity));
    map.removeLayer(cityMarkers[selectedCity].marker);
    delete cityMarkers[selectedCity];

    modalCity.classList.add("hidden");
    updateTotalSpent();
    updateTimelineUI();
  };

  /* ---- 연결 모드 ---- */
  document.getElementById("city-connect").onclick = () => {
    connectMode = true;
    connectFromCityId = selectedCity;

    if (previewLine) {
      map.removeLayer(previewLine);
      previewLine = null;
    }

    modalCity.classList.add("hidden");
  };

  /* ---- 취소 ---- */
  document.getElementById("city-cancel").onclick = () => {
    modalCity.classList.add("hidden");

    if (previewLine) {
      map.removeLayer(previewLine);
      previewLine = null;
    }
  };

  /* ================================
     지출 항목 추가 (이제 정상 통합됨)
  ================================ */
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
  addSpentBtn.addEventListener("touchstart", e => { e.preventDefault(); addSpentRow(); });
}

/* ================================
   Preview Line Follow Mouse
================================ */
map.on("mousemove", (e) => {
  if (!connectMode || !connectFromCityId) return;

  const fromCity = cityMarkers[connectFromCityId];
  if (!fromCity) return;

  const startPos = fromCity.marker.getLatLng();
  const toPos = e.latlng;

  if (!previewLine) {
    previewLine = L.polyline([startPos, toPos], {
      color: "#7a0a0aff",
      weight: 7,
      opacity: 0.7,
      className: "preview-line"
    }).addTo(map);
  } else {
    previewLine.setLatLngs([startPos, toPos]);
  }
});