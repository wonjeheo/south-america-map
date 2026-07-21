import { map, transportColors } from "./map.js";
import {
  db,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "./firebase.js";
import { COLLECTIONS } from "./config.js";
import { getAccessMode, isAdminMode, requireAdminMode } from "./state.js";
import { cityMarkers, routeLines } from "./store.js";

let selectedRoute = null;
let pendingFromCityId = null;
let pendingToCityId = null;

const modalRoute = document.getElementById("modal-route");
const routeTransport = document.getElementById("route-transport");
const routeCost = document.getElementById("route-cost");
const routeNote = document.getElementById("route-note");
const routePublicPath = document.getElementById("route-public-path");
const routePublicTransport = document.getElementById("route-public-transport");

function notifyDataChanged() {
  document.dispatchEvent(new CustomEvent("travel-data-changed"));
}

function safeTransport(value) {
  return Object.hasOwn(transportColors, value) ? value : "버스";
}

function safeText(value, maxLength = 200) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function parseCost(value) {
  const cost = Number(value);
  if (!Number.isFinite(cost) || cost < 0 || cost > 100_000_000) {
    throw new Error("비용은 0원 이상 1억원 이하의 숫자로 입력하세요.");
  }
  return Math.round(cost);
}

function resolveCity(route, side) {
  const idKey = side === "from" ? "FromId" : "ToId";
  const nameKey = side === "from" ? "From" : "To";

  if (route[idKey] && cityMarkers[route[idKey]]) {
    return cityMarkers[route[idKey]];
  }

  return Object.values(cityMarkers).find(city => city.data.City === route[nameKey]);
}

export function clearRoutes() {
  Object.values(routeLines).forEach(route => {
    if (route.line && map.hasLayer(route.line)) {
      map.removeLayer(route.line);
    }
  });

  Object.keys(routeLines).forEach(id => delete routeLines[id]);
  selectedRoute = null;
  pendingFromCityId = null;
  pendingToCityId = null;
}

export function removeRouteFromMap(routeId) {
  const route = routeLines[routeId];
  if (!route) return;
  if (route.line && map.hasLayer(route.line)) {
    map.removeLayer(route.line);
  }
  delete routeLines[routeId];
}

export function highlightRoutesByCity(cityId, cityName) {
  Object.values(routeLines).forEach(route => {
    const isLinked =
      route.fromCityId === cityId ||
      route.toCityId === cityId ||
      route.data.From === cityName ||
      route.data.To === cityName;

    if (isLinked && route.line?._path) {
      route.line._path.classList.add("route-highlight");
    }
  });
}

export function unhighlightAllRoutes() {
  Object.values(routeLines).forEach(route => {
    route.line?._path?.classList.remove("route-highlight");
  });
}

export function clearAllRouteEffects() {
  Object.values(routeLines).forEach(route => {
    route.line?._path?.classList.remove("route-highlight", "route-animate");
  });
}

export function createRouteLine(id, route, fromCity, toCity) {
  const transport = safeTransport(route.Transport);
  const line = L.polyline(
    [fromCity.marker.getLatLng(), toCity.marker.getLatLng()],
    {
      color: transportColors[transport],
      weight: 4,
      interactive: true
    }
  ).addTo(map);

  line.once("add", () => {
    if (line._path) line._path.style.pointerEvents = "stroke";
  });

  const normalizedRoute = {
    From: safeText(route.From || fromCity.data.City, 100),
    To: safeText(route.To || toCity.data.City, 100),
    FromId: route.FromId || fromCity.id,
    ToId: route.ToId || toCity.id,
    Transport: transport,
    Cost: Number(route.Cost || 0),
    Note: safeText(route.Note, 300),
    Order: Number(route.Order || 0)
  };

  routeLines[id] = {
    id,
    data: normalizedRoute,
    line,
    fromCityId: fromCity.id,
    toCityId: toCity.id
  };

  line.on("click", () => {
    selectedRoute = id;
    pendingFromCityId = null;
    pendingToCityId = null;

    routePublicPath.textContent = `${normalizedRoute.From} → ${normalizedRoute.To}`;
    routePublicTransport.textContent = `이동수단: ${normalizedRoute.Transport}`;

    if (isAdminMode()) {
      routeTransport.value = normalizedRoute.Transport;
      routeCost.value = String(normalizedRoute.Cost || "");
      routeNote.value = normalizedRoute.Note;
    }

    modalRoute.classList.remove("hidden");
  });
}

export async function loadRoutes() {
  const collectionName = getAccessMode() === "admin"
    ? COLLECTIONS.privateRoutes
    : COLLECTIONS.publicRoutes;

  const snapshot = await getDocs(collection(db, collectionName));

  snapshot.forEach(documentSnapshot => {
    const route = documentSnapshot.data();
    const fromCity = resolveCity(route, "from");
    const toCity = resolveCity(route, "to");

    if (!fromCity || !toCity) {
      console.warn("도시와 연결되지 않은 경로를 건너뜁니다.", documentSnapshot.id);
      return;
    }

    createRouteLine(documentSnapshot.id, route, fromCity, toCity);
  });
}

export function openNewRouteModal(fromCityId, toCityId) {
  requireAdminMode();

  if (!cityMarkers[fromCityId] || !cityMarkers[toCityId]) {
    throw new Error("연결할 도시를 찾을 수 없습니다.");
  }

  selectedRoute = null;
  pendingFromCityId = fromCityId;
  pendingToCityId = toCityId;

  const fromName = cityMarkers[fromCityId].data.City;
  const toName = cityMarkers[toCityId].data.City;
  routePublicPath.textContent = `${fromName} → ${toName}`;
  routePublicTransport.textContent = "이동수단을 선택하세요.";

  routeTransport.value = "비행기";
  routeCost.value = "";
  routeNote.value = "";
  modalRoute.classList.remove("hidden");
}

export function updateTotalSpent() {
  const totalElement = document.getElementById("total-spent");
  if (!isAdminMode()) {
    totalElement.textContent = "0";
    return;
  }

  let total = 0;
  Object.values(cityMarkers).forEach(city => {
    (city.data.Spent || []).forEach(item => {
      total += Number(item.cost || 0);
    });
  });
  Object.values(routeLines).forEach(route => {
    total += Number(route.data.Cost || 0);
  });

  totalElement.textContent = total.toLocaleString("ko-KR");
}

export function setupRouteEvents() {
  document.getElementById("route-save").addEventListener("click", async () => {
    try {
      requireAdminMode();

      const transport = safeTransport(routeTransport.value);
      const cost = parseCost(routeCost.value || 0);
      const note = safeText(routeNote.value, 300);

      if (!selectedRoute) {
        const fromCity = cityMarkers[pendingFromCityId];
        const toCity = cityMarkers[pendingToCityId];
        if (!fromCity || !toCity) throw new Error("연결할 도시를 찾을 수 없습니다.");

        const payload = {
          From: fromCity.data.City,
          To: toCity.data.City,
          FromId: fromCity.id,
          ToId: toCity.id,
          Transport: transport,
          Cost: cost,
          Note: note
        };

        const reference = await addDoc(collection(db, COLLECTIONS.privateRoutes), payload);
        createRouteLine(reference.id, payload, fromCity, toCity);
      } else {
        const route = routeLines[selectedRoute];
        if (!route) throw new Error("수정할 경로를 찾을 수 없습니다.");

        await updateDoc(doc(db, COLLECTIONS.privateRoutes, selectedRoute), {
          Transport: transport,
          Cost: cost,
          Note: note
        });

        route.data.Transport = transport;
        route.data.Cost = cost;
        route.data.Note = note;
        route.line.setStyle({ color: transportColors[transport] });
      }

      selectedRoute = null;
      pendingFromCityId = null;
      pendingToCityId = null;
      modalRoute.classList.add("hidden");
      notifyDataChanged();
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("route-delete").addEventListener("click", async () => {
    try {
      requireAdminMode();
      if (!selectedRoute) return;

      await deleteDoc(doc(db, COLLECTIONS.privateRoutes, selectedRoute));
      removeRouteFromMap(selectedRoute);
      selectedRoute = null;
      modalRoute.classList.add("hidden");
      notifyDataChanged();
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("route-cancel").addEventListener("click", () => {
    selectedRoute = null;
    pendingFromCityId = null;
    pendingToCityId = null;
    modalRoute.classList.add("hidden");
  });
}
