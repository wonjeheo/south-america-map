// js/map.js
export const transportColors = {
  "비행기": "#1E90FF",
  "버스": "#32CD32",
  "기차": "#000000"
};

export const map = L.map("map", {
  preferCanvas: true,
  tap: false,              // 🔥 iOS 터치 충돌 해결
  touchZoom: true,
  dragging: true
}).setView([-10, -65], 4.3);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18
}).addTo(map);

export const iconRed = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40]
});

