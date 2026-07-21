import {
  db,
  auth,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc
} from "./firebase.js";
import { COLLECTIONS, isConfiguredAdmin } from "./config.js";
import { requireAdminMode } from "./state.js";

function safeText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function validCoordinates(coords) {
  return Array.isArray(coords) &&
    coords.length === 2 &&
    Number.isFinite(Number(coords[0])) &&
    Number.isFinite(Number(coords[1])) &&
    Number(coords[0]) >= -90 && Number(coords[0]) <= 90 &&
    Number(coords[1]) >= -180 && Number(coords[1]) <= 180;
}

function monthOnly(dateValue) {
  const value = safeText(dateValue, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(0, 7) : "";
}

async function removeStaleDocuments(collectionName, activeIds) {
  const snapshot = await getDocs(collection(db, collectionName));
  const staleIds = snapshot.docs
    .map(documentSnapshot => documentSnapshot.id)
    .filter(id => !activeIds.has(id));

  await Promise.all(staleIds.map(id =>
    deleteDoc(doc(db, collectionName, id))
  ));
}

export async function publishPublicSnapshot() {
  requireAdminMode();
  const user = auth.currentUser;
  if (!user || !isConfiguredAdmin(user.uid)) {
    throw new Error("설정된 관리자 계정으로 로그인해야 합니다.");
  }

  const [citySnapshot, routeSnapshot] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.privateCities)),
    getDocs(collection(db, COLLECTIONS.privateRoutes))
  ]);

  const privateCities = citySnapshot.docs
    .map(documentSnapshot => ({ id: documentSnapshot.id, ...documentSnapshot.data() }))
    .filter(city => validCoordinates(city.Coords))
    .sort((a, b) => {
      const aDate = safeText(a.Stay_in, 10) || "9999-99-99";
      const bDate = safeText(b.Stay_in, 10) || "9999-99-99";
      return aDate.localeCompare(bDate);
    });

  const cityNameToId = new Map();
  privateCities.forEach(city => cityNameToId.set(safeText(city.City, 100), city.id));

  const publicCities = privateCities.map((city, index) => ({
    id: city.id,
    data: {
      City: safeText(city.City, 100) || "이름 없는 도시",
      Coords: [Number(city.Coords[0]), Number(city.Coords[1])],
      VisitMonth: monthOnly(city.Stay_in),
      VisitOrder: index + 1
    }
  }));

  const publicRoutes = routeSnapshot.docs.map((documentSnapshot, index) => {
    const route = documentSnapshot.data();
    const fromName = safeText(route.From, 100);
    const toName = safeText(route.To, 100);
    const fromId = safeText(route.FromId, 128) || cityNameToId.get(fromName) || "";
    const toId = safeText(route.ToId, 128) || cityNameToId.get(toName) || "";

    if (!fromId || !toId) return null;

    return {
      id: documentSnapshot.id,
      data: {
        From: fromName,
        To: toName,
        FromId: fromId,
        ToId: toId,
        Transport: safeText(route.Transport, 20) || "버스",
        Order: index + 1
      }
    };
  }).filter(Boolean);

  await Promise.all([
    ...publicCities.map(city =>
      setDoc(doc(db, COLLECTIONS.publicCities, city.id), city.data)
    ),
    ...publicRoutes.map(route =>
      setDoc(doc(db, COLLECTIONS.publicRoutes, route.id), route.data)
    )
  ]);

  await Promise.all([
    removeStaleDocuments(COLLECTIONS.publicCities, new Set(publicCities.map(city => city.id))),
    removeStaleDocuments(COLLECTIONS.publicRoutes, new Set(publicRoutes.map(route => route.id)))
  ]);

  return {
    cityCount: publicCities.length,
    routeCount: publicRoutes.length
  };
}
