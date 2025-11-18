// js/timeline.js
import { db, collection, getDocs } from "./firebase.js";
import { cityMarkers } from "./city.js";
import { map } from "./map.js";
import {
  highlightRoutesByCity,
  unhighlightAllRoutes
} from "./route.js";

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

export async function buildDateTimeline() {
  const snap = await getDocs(collection(db, "Cities"));
  const cities = snap.docs.map(d => d.data());

  cities.sort((a, b) => new Date(a.Stay_in) - new Date(b.Stay_in));
  return cities.map(c => ({
    city: c.City,
    start: c.Stay_in,
    end: c.Stay_out
  }));
}

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

    div.onmouseenter = () => {
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
      const cityEntry = Object.values(cityMarkers)
        .find(c => c.data.City === t.city);

      if (cityEntry)
        cityEntry.marker.setIcon(cityEntry.marker.options.icon);

      unhighlightAllRoutes();
    };

    div.onclick = () => {
    const cityEntry = Object.values(cityMarkers)
        .find(c => c.data.City === t.city);

    if (!cityEntry) return;

    const pos = cityEntry.data.Coords;

    map.flyTo(pos, 6, {
        animate: true,
        duration: 1.2
    });


    };

    box.appendChild(div);
    box.appendChild(document.createElement("hr"));
  });
}
