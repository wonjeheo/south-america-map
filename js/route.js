// js/route.js
import { map, transportColors } from "./map.js";
import {
  db, collection, addDoc, updateDoc, deleteDoc, doc, getDocs
} from "./firebase.js";
import { cityMarkers } from "./city.js";
import { updateTimelineUI } from "./timeline.js";

export const routeLines = {};
export let selectedRoute = null;

function getMiddlePoint(fromLatLng, toLatLng) {
  return L.latLng(
    (fromLatLng.lat + toLatLng.lat) / 2,
    (fromLatLng.lng + toLatLng.lng) / 2
  );
}


/* ============================================================
    라인 강조/해제/애니메이션 유틸
============================================================ */
export function highlightRoutesByCity(cityName) {
  Object.values(routeLines).forEach(r => {
    if (r.data.From === cityName || r.data.To === cityName) {
      if (r.line._path) r.line._path.classList.add("route-highlight");
    }
  });
}

export function unhighlightAllRoutes() {
  Object.values(routeLines).forEach(r => {
    if (r.line._path) r.line._path.classList.remove("route-highlight");
  });
}

export function animateRoutesByCity(cityName) {
  Object.values(routeLines).forEach(r => {
    if (r.data.From === cityName || r.data.To === cityName) {
      if (r.line._path) r.line._path.classList.add("route-animate");
    }
  });

  // 애니메이션 3초 후 자동 종료
  setTimeout(() => {
    Object.values(routeLines).forEach(r => {
      if (r.line._path) r.line._path.classList.remove("route-animate");
    });
  }, 3000);
}

/* ============================================================
   Polyline 생성 (화살표 제거 버전)
============================================================ */
export function createRouteLine(id, r, fromLatLng, toLatLng) {

  const line = L.polyline(
    [fromLatLng, toLatLng],
    { color: transportColors[r.Transport], weight: 4, interactive: true }
  ).addTo(map);

  line.options.interactive = true;

  // Leaflet 경로 클릭 버그 방지
  line.once("add", () => {
    if (line._path) {
      line._path.style.pointerEvents = "stroke";
    }
  });

  // routeLines 저장
  routeLines[id] = { id, data: r, line };

  /* ---- 라인 클릭 이벤트 ---- */
  line.on("click", () => {
    selectedRoute = id;

    document.getElementById("route-transport").value = r.Transport;
    document.getElementById("route-cost").value = r.Cost;
    document.getElementById("route-note").value = r.Note;

    document.getElementById("route-delete").style.display = "block";
    document.getElementById("modal-route").classList.remove("hidden");
  });
}

/* ============================================================
   DB 로딩
============================================================ */
export async function loadRoutes() {
  const snap = await getDocs(collection(db, "Routes"));
  snap.forEach(d => {
    const r = d.data();

    const fromCity = Object.values(cityMarkers).find(c => c.data.City === r.From);
    const toCity   = Object.values(cityMarkers).find(c => c.data.City === r.To);

    createRouteLine(
      d.id,
      r,
      fromCity.marker.getLatLng(),
      toCity.marker.getLatLng()
    );
  });
}

/* ============================================================
   전체 경비 합산
============================================================ */
export async function updateTotalSpent() {
  let total = 0;

  const citiesSnap = await getDocs(collection(db, "Cities"));
  citiesSnap.forEach(doc => {
    const data = doc.data();
    if (data.Spent) {
      data.Spent.forEach(s => total += Number(s.cost || 0));
    }
  });

  const routesSnap = await getDocs(collection(db, "Routes"));
  routesSnap.forEach(doc => {
    const r = doc.data();
    total += Number(r.Cost || 0);
  });

  document.getElementById("total-spent").textContent =
    total.toLocaleString();
}

/* ============================================================
   이벤트 설정
============================================================ */
export function setupRouteEvents() {

  /* ---- 저장 ---- */
  document.getElementById("route-save").onclick = async () => {
    const transport = document.getElementById("route-transport").value;
    const cost = document.getElementById("route-cost").value;
    const note = document.getElementById("route-note").value;

    /* 신규 생성 */
    if (!selectedRoute) {
      const fromCity = cityMarkers[window.routeFrom];
      const toCity   = cityMarkers[window.routeTo];

      const ref = await addDoc(collection(db, "Routes"), {
        From: fromCity.data.City,
        To: toCity.data.City,
        Transport: transport,
        Cost: cost,
        Note: note
      });

      createRouteLine(
        ref.id,
        { From: fromCity.data.City, To: toCity.data.City, Transport: transport, Cost: cost, Note: note },
        fromCity.marker.getLatLng(),
        toCity.marker.getLatLng()
      );

    /* 기존 라인 수정 */
    } else {
      await updateDoc(doc(db, "Routes", selectedRoute), {
        Transport: transport,
        Cost: cost,
        Note: note
      });

      const r = routeLines[selectedRoute];

      // 내부 데이터 갱신
      r.data.Transport = transport;
      r.data.Cost = cost;
      r.data.Note = note;

      // 라인 색상 변경
      r.line.setStyle({ color: transportColors[transport] });
    }

    selectedRoute = null;

    document.getElementById("modal-route").classList.add("hidden");
    updateTotalSpent();
    updateTimelineUI();
  };

  /* ---- 삭제 ---- */
  document.getElementById("route-delete").onclick = async () => {
    if (!selectedRoute) return;

    map.removeLayer(routeLines[selectedRoute].line);
    await deleteDoc(doc(db, "Routes", selectedRoute));

    delete routeLines[selectedRoute];
    selectedRoute = null;

    document.getElementById("modal-route").classList.add("hidden");
    updateTotalSpent();
    updateTimelineUI();
  };

  /* ---- 취소 ---- */
  document.getElementById("route-cancel").onclick = () => {
    selectedRoute = null;
    document.getElementById("modal-route").classList.add("hidden");
  };
}
