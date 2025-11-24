// js/timeline.js
import { db, collection, getDocs } from "./firebase.js";
// 🔥 [수정됨] setClockTargetCity 가져오기
import { cityMarkers, setClockTargetCity } from "./city.js"; 
import { map } from "./map.js";
import {
  clearAllRouteEffects,
  highlightRoutesByCity,
  unhighlightAllRoutes,
  routeLines
} from "./route.js";


/* ============================================================
   (안 쓰이는 함수지만 호환성을 위해 유지)
   경로 연결 순서대로 타임라인 빌드
============================================================ */
export async function buildRouteTimeline() {
  const snap = await getDocs(collection(db, "Routes"));
  const edges = snap.docs.map(d => d.data());

  if (edges.length === 0) return [];

  const fromSet = new Set(edges.map(e => e.From));
  const toSet = new Set(edges.map(e => e.To));

  const start = [...fromSet].find(c => !toSet.has(c));
  if (!start) return [];

  const timeline = [start];
  let current = start;

  while (true) {
    const next = edges.find(e => e.From === current);
    if (!next) break;
    timeline.push(next.To);
    current = next.To;
  }

  return timeline;
}


/* ============================================================
   🔥 [유지됨] 날짜 기준 타임라인 데이터 생성
   (날짜가 없는 도시는 여기서 제외됩니다)
============================================================ */
export async function buildDateTimeline() {
  const snap = await getDocs(collection(db, "Cities"));
  let cities = snap.docs.map(d => d.data());

  // 🔥 필터링: 날짜(In/Out)가 빈 문자열("")이거나 없는 경우 제외
  cities = cities.filter(c => c.Stay_in && c.Stay_out);

  // 날짜순 정렬
  cities.sort((a, b) => new Date(a.Stay_in) - new Date(b.Stay_in));

  return cities.map(c => ({
    city: c.City,
    start: c.Stay_in,
    end: c.Stay_out
  }));
}


/* ============================================================
   UI 업데이트
============================================================ */
export async function updateTimelineUI() {
  const dateTimeline = await buildDateTimeline();
  const box = document.getElementById("timeline-box");
  box.innerHTML = "";

  dateTimeline.forEach(t => {
    const div = document.createElement("div");
    div.classList.add("timeline-item");
    div.dataset.city = t.city;

    div.innerHTML = `
      <b>${t.city}</b><br>
      ${t.start} ~ ${t.end}
    `;

    /* --- 마우스 hover --- */
    div.onmouseenter = () => {
      // cityMarkers가 아직 로드되지 않았을 수 있으므로 체크
      if (!cityMarkers) return;

      const cityEntry = Object.values(cityMarkers)
        .find(c => c.data.City === t.city);

      if (cityEntry) {
        cityEntry.marker.setIcon(
          L.icon({
            iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
            iconSize: [55, 55],
            iconAnchor: [27, 52]
          })
        );
      }

      unhighlightAllRoutes();
      highlightRoutesByCity(t.city);
    };

    div.onmouseleave = () => {
      if (!cityMarkers) return;

      const cityEntry = Object.values(cityMarkers)
        .find(c => c.data.City === t.city);

      if (cityEntry)
        cityEntry.marker.setIcon(cityEntry.marker.options.icon);

      unhighlightAllRoutes();
    };


    /* --- 타임라인에서 도시 클릭 → flyTo --- */
    div.onclick = () => {
      if (!cityMarkers) return;

      const cityEntry = Object.values(cityMarkers)
        .find(c => c.data.City === t.city);

      if (!cityEntry) return;

      // 🔥 [핵심 추가] 클릭한 도시를 시계 타겟으로 설정!
      setClockTargetCity(cityEntry.data);

      const pos = cityEntry.data.Coords;

      // 1) 모든 라인 잠시 제거
      const removedLines = [];
      Object.values(routeLines).forEach(r => {
        if (r.line) {
          removedLines.push(r.line);
          map.removeLayer(r.line);
        }
      });

      // 2) 지도 이동
      map.flyTo(pos, 6, { animate: true, duration: 1.2 });

      // 3) 이동 후 라인 복구
      map.once("moveend", () => {
        removedLines.forEach(line => {
          line.addTo(map);
        });
        clearAllRouteEffects();
        highlightRoutesByCity(t.city);
      });
    };

    box.appendChild(div);
    box.appendChild(document.createElement("hr"));
  });
}