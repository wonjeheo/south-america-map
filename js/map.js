export const transportColors = Object.freeze({
  "비행기": "#1E90FF",
  "버스": "#32CD32",
  "기차": "#111111",
  "야간버스": "#4B0082"
});

export const map = L.map("map", {
  tap: false,
  touchZoom: true,
  dragging: true,
  zoomControl: true,
  tapTolerance: 15
}).setView([-10, -65], 4.3);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

export function createNormalIcon(size = 40) {
  return L.icon({
    iconUrl: "./assets/marker.svg",
    iconSize: [size, size],
    iconAnchor: [size / 2, size]
  });
}

export function createHighlightIcon(size = 55) {
  return L.icon({
    iconUrl: "./assets/marker-highlight.svg",
    iconSize: [size, size],
    iconAnchor: [size / 2, size]
  });
}

export const iconRed = createNormalIcon();
