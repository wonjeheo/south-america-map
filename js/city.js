import { map, createNormalIcon } from "./map.js";
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
import { cityMarkers, routeLines, uiState } from "./store.js";
import { openNewRouteModal, removeRouteFromMap } from "./route.js";

let selectedCity = null;
let connectMode = false;
let connectFromCityId = null;
let isAddCityMode = false;
let addCityPosition = null;

const modalCity = document.getElementById("modal-city");
const addCityOverlay = document.getElementById("add-city-overlay");
const cityNameInput = document.getElementById("city-name");
const cityInInput = document.getElementById("city-in");
const cityOutInput = document.getElementById("city-out");
const cityHotelInput = document.getElementById("city-hotel");
const spentList = document.getElementById("spent-list");

function notifyDataChanged() {
  document.dispatchEvent(new CustomEvent("travel-data-changed"));
}

function showAddOverlay() {
  addCityOverlay.classList.remove("hidden");
  addCityOverlay.classList.add("visible");
}

function hideAddOverlay() {
  addCityOverlay.classList.remove("visible");
  addCityOverlay.classList.add("hidden");
}

function safeText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function validateCoordinates(coords) {
  return Array.isArray(coords) &&
    coords.length === 2 &&
    Number.isFinite(Number(coords[0])) &&
    Number.isFinite(Number(coords[1])) &&
    Number(coords[0]) >= -90 && Number(coords[0]) <= 90 &&
    Number(coords[1]) >= -180 && Number(coords[1]) <= 180;
}

function formatVisitMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return "방문 시기 비공개";
  const [year, month] = value.split("-");
  return `${year}년 ${Number(month)}월`;
}

function collectSpentList() {
  const rows = spentList.querySelectorAll(".spent-row");
  if (rows.length > 100) throw new Error("지출 항목은 최대 100개까지 저장할 수 있습니다.");

  return Array.from(rows).map(row => {
    const title = safeText(row.querySelector(".spent-title").value, 100);
    const rawCost = row.querySelector(".spent-cost").value;
    const cost = Number(rawCost || 0);

    if (!Number.isFinite(cost) || cost < 0 || cost > 100_000_000) {
      throw new Error("각 지출 금액은 0원 이상 1억원 이하로 입력하세요.");
    }

    return { title, cost: Math.round(cost) };
  }).filter(item => item.title || item.cost);
}

function updateCitySpentPreview() {
  let total = 0;
  spentList.querySelectorAll(".spent-cost").forEach(input => {
    const cost = Number(input.value || 0);
    if (Number.isFinite(cost) && cost > 0) total += cost;
  });

  document.getElementById("city-spent-total").textContent =
    `도시 지출 총합: ${Math.round(total).toLocaleString("ko-KR")}원`;
}

function appendSpentRow(title = "", cost = 0) {
  const row = document.createElement("div");
  row.className = "spent-row";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "spent-title";
  titleInput.maxLength = 100;
  titleInput.placeholder = "내용";
  titleInput.value = safeText(title, 100);

  const costInput = document.createElement("input");
  costInput.type = "number";
  costInput.className = "spent-cost";
  costInput.min = "0";
  costInput.max = "100000000";
  costInput.step = "1";
  costInput.placeholder = "금액";
  costInput.value = Number.isFinite(Number(cost)) && Number(cost) > 0 ? String(Math.round(Number(cost))) : "";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "spent-remove";
  removeButton.textContent = "삭제";
  removeButton.addEventListener("click", () => {
    row.remove();
    updateCitySpentPreview();
  });

  titleInput.addEventListener("input", updateCitySpentPreview);
  costInput.addEventListener("input", updateCitySpentPreview);

  row.append(titleInput, costInput, removeButton);
  spentList.appendChild(row);
}

function resetCityForm() {
  cityNameInput.value = "";
  cityInInput.value = "";
  cityOutInput.value = "";
  cityHotelInput.value = "";
  spentList.replaceChildren();
  updateCitySpentPreview();
}

function openCityModal(cityId, city) {
  selectedCity = cityId;
  uiState.clockTargetCity = city;

  document.getElementById("modal-city-title").textContent = city.City || "도시 정보";
  document.getElementById("city-public-name").textContent = city.City || "이름 없는 도시";

  const publicPeriod = isAdminMode()
    ? `${city.Stay_in || "날짜 미입력"} ~ ${city.Stay_out || "날짜 미입력"}`
    : formatVisitMonth(city.VisitMonth);
  document.getElementById("city-public-period").textContent = publicPeriod;

  if (isAdminMode()) {
    cityNameInput.value = city.City || "";
    cityInInput.value = city.Stay_in || "";
    cityOutInput.value = city.Stay_out || "";
    cityHotelInput.value = city.Hotel || "";
    spentList.replaceChildren();
    (city.Spent || []).forEach(item => appendSpentRow(item.title, item.cost));
    updateCitySpentPreview();
  }

  modalCity.classList.remove("hidden");
}

export function clearCities() {
  Object.values(cityMarkers).forEach(city => {
    if (city.marker && map.hasLayer(city.marker)) {
      map.removeLayer(city.marker);
    }
  });
  Object.keys(cityMarkers).forEach(id => delete cityMarkers[id]);
  selectedCity = null;
  uiState.clockTargetCity = null;
}

export function createCityMarker(id, city) {
  if (!validateCoordinates(city.Coords)) {
    console.warn("잘못된 좌표의 도시를 건너뜁니다.", id);
    return;
  }

  const normalizedCity = {
    City: safeText(city.City, 100) || "이름 없는 도시",
    Coords: [Number(city.Coords[0]), Number(city.Coords[1])],
    Stay_in: safeText(city.Stay_in, 10),
    Stay_out: safeText(city.Stay_out, 10),
    Hotel: safeText(city.Hotel, 200),
    Spent: Array.isArray(city.Spent) ? city.Spent : [],
    VisitMonth: safeText(city.VisitMonth, 7),
    VisitOrder: Number(city.VisitOrder || 0)
  };

  const normalIcon = createNormalIcon();
  const marker = L.marker(normalizedCity.Coords, { icon: normalIcon }).addTo(map);
  cityMarkers[id] = { id, data: normalizedCity, marker, normalIcon };

  marker.on("click", () => {
    if (connectMode) {
      if (!isAdminMode()) {
        connectMode = false;
        return;
      }
      if (id === connectFromCityId) return;

      try {
        openNewRouteModal(connectFromCityId, id);
      } catch (error) {
        alert(error.message);
      }
      connectMode = false;
      connectFromCityId = null;
      return;
    }

    openCityModal(id, normalizedCity);
  });
}

export async function loadCities() {
  const collectionName = getAccessMode() === "admin"
    ? COLLECTIONS.privateCities
    : COLLECTIONS.publicCities;

  const snapshot = await getDocs(collection(db, collectionName));
  snapshot.forEach(documentSnapshot => {
    createCityMarker(documentSnapshot.id, documentSnapshot.data());
  });
}

function validateCityForm() {
  const name = safeText(cityNameInput.value, 100);
  const stayIn = safeText(cityInInput.value, 10);
  const stayOut = safeText(cityOutInput.value, 10);
  const hotel = safeText(cityHotelInput.value, 200);

  if (!name) throw new Error("도시 이름을 입력하세요.");
  if (!isValidDate(stayIn) || !isValidDate(stayOut)) {
    throw new Error("DATE IN과 DATE OUT을 올바른 날짜로 입력하세요.");
  }
  if (stayIn > stayOut) throw new Error("DATE OUT은 DATE IN보다 빠를 수 없습니다.");

  return {
    City: name,
    Stay_in: stayIn,
    Stay_out: stayOut,
    Hotel: hotel,
    Spent: collectSpentList()
  };
}

export function setupCityEvents() {
  document.getElementById("add-city-mobile").addEventListener("click", () => {
    try {
      requireAdminMode();
      isAddCityMode = true;
      showAddOverlay();
    } catch (error) {
      alert(error.message);
    }
  });

  let pressTimer = null;
  map.on("mousedown touchstart", () => {
    if (!isAdminMode() || isAddCityMode) return;
    pressTimer = setTimeout(() => {
      isAddCityMode = true;
      showAddOverlay();
    }, 700);
  });

  map.on("mouseup touchend dragstart", () => {
    if (pressTimer) clearTimeout(pressTimer);
  });

  map.on("click", event => {
    if (!isAdminMode() || !isAddCityMode) return;

    addCityPosition = [event.latlng.lat, event.latlng.lng];
    hideAddOverlay();
    selectedCity = null;
    resetCityForm();
    document.getElementById("modal-city-title").textContent = "새 도시 추가";
    document.getElementById("city-public-name").textContent = "새 도시";
    document.getElementById("city-public-period").textContent = "날짜를 입력하세요.";
    modalCity.classList.remove("hidden");
    isAddCityMode = false;
  });

  document.getElementById("city-save").addEventListener("click", async () => {
    try {
      requireAdminMode();
      const payload = validateCityForm();

      if (!selectedCity) {
        if (!validateCoordinates(addCityPosition)) throw new Error("지도에서 도시 위치를 선택하세요.");
        const createPayload = { ...payload, Coords: addCityPosition };
        const reference = await addDoc(collection(db, COLLECTIONS.privateCities), createPayload);
        createCityMarker(reference.id, createPayload);
      } else {
        const city = cityMarkers[selectedCity];
        if (!city) throw new Error("수정할 도시를 찾을 수 없습니다.");
        const previousName = city.data.City;

        await updateDoc(doc(db, COLLECTIONS.privateCities, selectedCity), payload);
        Object.assign(city.data, payload);

        if (previousName !== payload.City) {
          const routeUpdates = [];
          Object.values(routeLines).forEach(route => {
            const update = {};
            if (route.fromCityId === selectedCity || route.data.From === previousName) {
              update.From = payload.City;
              route.data.From = payload.City;
            }
            if (route.toCityId === selectedCity || route.data.To === previousName) {
              update.To = payload.City;
              route.data.To = payload.City;
            }
            if (Object.keys(update).length) {
              routeUpdates.push(updateDoc(doc(db, COLLECTIONS.privateRoutes, route.id), update));
            }
          });
          await Promise.all(routeUpdates);
        }
      }

      addCityPosition = null;
      modalCity.classList.add("hidden");
      notifyDataChanged();
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("city-delete").addEventListener("click", async () => {
    try {
      requireAdminMode();
      if (!selectedCity || !cityMarkers[selectedCity]) return;
      if (!confirm("이 도시와 연결된 경로를 함께 삭제할까요?")) return;

      const city = cityMarkers[selectedCity];
      const linkedRouteIds = Object.values(routeLines)
        .filter(route =>
          route.fromCityId === selectedCity ||
          route.toCityId === selectedCity ||
          route.data.From === city.data.City ||
          route.data.To === city.data.City
        )
        .map(route => route.id);

      await Promise.all(linkedRouteIds.map(routeId =>
        deleteDoc(doc(db, COLLECTIONS.privateRoutes, routeId))
      ));
      linkedRouteIds.forEach(removeRouteFromMap);

      await deleteDoc(doc(db, COLLECTIONS.privateCities, selectedCity));
      if (map.hasLayer(city.marker)) map.removeLayer(city.marker);
      delete cityMarkers[selectedCity];
      selectedCity = null;
      modalCity.classList.add("hidden");
      notifyDataChanged();
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("city-connect").addEventListener("click", () => {
    try {
      requireAdminMode();
      if (!selectedCity) throw new Error("먼저 출발 도시를 선택하세요.");
      connectMode = true;
      connectFromCityId = selectedCity;
      modalCity.classList.add("hidden");
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("city-cancel").addEventListener("click", () => {
    modalCity.classList.add("hidden");
    if (!selectedCity) addCityPosition = null;
  });

  document.getElementById("add-spent-item").addEventListener("click", () => {
    try {
      requireAdminMode();
      appendSpentRow();
      updateCitySpentPreview();
    } catch (error) {
      alert(error.message);
    }
  });
}

map.on("zoomend", () => {
  const scale = Math.max(0.5, Math.min(map.getZoom() / 6, 2));
  const size = 40 * scale;

  Object.values(cityMarkers).forEach(city => {
    city.normalIcon = createNormalIcon(size);
    city.marker.setIcon(city.normalIcon);
  });
});
