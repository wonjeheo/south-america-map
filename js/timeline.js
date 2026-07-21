import { map, createHighlightIcon } from "./map.js";
import { isAdminMode } from "./state.js";
import { cityMarkers, routeLines, uiState } from "./store.js";
import {
  clearAllRouteEffects,
  highlightRoutesByCity,
  unhighlightAllRoutes
} from "./route.js";

function formatVisitMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return "방문 시기 비공개";
  const [year, month] = value.split("-");
  return `${year}년 ${Number(month)}월`;
}

function getTimelineEntries() {
  return Object.values(cityMarkers)
    .map(city => ({
      id: city.id,
      city: city.data.City,
      start: city.data.Stay_in || "",
      end: city.data.Stay_out || "",
      visitMonth: city.data.VisitMonth || "",
      order: Number(city.data.VisitOrder || 0)
    }))
    .sort((a, b) => {
      if (isAdminMode()) {
        return (a.start || "9999-99-99").localeCompare(b.start || "9999-99-99");
      }
      if (a.order !== b.order) return a.order - b.order;
      return a.city.localeCompare(b.city, "ko");
    });
}

export function updateTimelineUI() {
  const box = document.getElementById("timeline-box");
  const empty = document.getElementById("timeline-empty");
  box.replaceChildren();

  const entries = getTimelineEntries();
  empty.classList.toggle("hidden", entries.length > 0);

  entries.forEach(entry => {
    const cityEntry = cityMarkers[entry.id];
    if (!cityEntry) return;

    const item = document.createElement("button");
    item.type = "button";
    item.className = "timeline-item";

    const cityName = document.createElement("strong");
    cityName.textContent = entry.city;

    const period = document.createElement("span");
    period.textContent = isAdminMode()
      ? (entry.start && entry.end ? `${entry.start} ~ ${entry.end}` : "날짜 미입력")
      : formatVisitMonth(entry.visitMonth);

    item.append(cityName, period);

    item.addEventListener("mouseenter", () => {
      cityEntry.marker.setIcon(createHighlightIcon());
      unhighlightAllRoutes();
      highlightRoutesByCity(entry.id, entry.city);
    });

    item.addEventListener("mouseleave", () => {
      cityEntry.marker.setIcon(cityEntry.normalIcon);
      unhighlightAllRoutes();
    });

    item.addEventListener("click", () => {
      uiState.clockTargetCity = cityEntry.data;
      const position = cityEntry.data.Coords;
      const removedLines = [];

      Object.values(routeLines).forEach(route => {
        if (route.line && map.hasLayer(route.line)) {
          removedLines.push(route.line);
          map.removeLayer(route.line);
        }
      });

      map.flyTo(position, 6, { animate: true, duration: 1.2 });
      map.once("moveend", () => {
        removedLines.forEach(line => line.addTo(map));
        clearAllRouteEffects();
        highlightRoutesByCity(entry.id, entry.city);
      });
    });

    box.appendChild(item);
  });
}
