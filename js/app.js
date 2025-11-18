// js/app.js
import { loadCities, setupCityEvents } from "./city.js";
import { loadRoutes, updateTotalSpent, setupRouteEvents } from "./route.js";
import { updateTimelineUI } from "./timeline.js";
import { map } from "./map.js";
import { routeLines } from "./route.js";

setupCityEvents();
setupRouteEvents();

loadCities().then(() => {
  loadRoutes().then(() => {
    updateTotalSpent();
    updateTimelineUI();
  });
});

document.getElementById("btn-world").onclick = () => {
  map.flyTo([20, 0], 2.3, { duration: 1.5 });

  map.once("moveend", () => {
    Object.values(routeLines).forEach(r => {
      if (r.line?.redraw) r.line.redraw();
    });
  });
};

document.getElementById("btn-southamerica").onclick = () => {
  map.flyTo([-10, -65], 4.3, { duration: 1.5 });

  map.once("moveend", () => {
    Object.values(routeLines).forEach(r => {
      if (r.line?.redraw) r.line.redraw();
    });
  });
};
