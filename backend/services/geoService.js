import { LOGISTICS } from "../config/logistics.js";

const EARTH_RADIUS_KM = 6371;

export const haversineKm = (a, b) => {
  if (!a || !b) return 0;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

export const roadDistanceKm = (a, b) =>
  haversineKm(a, b) * LOGISTICS.roadElongation;

export const travelMinutes = (distanceKm) =>
  (distanceKm / LOGISTICS.averageSpeedKmh) * 60;

const fallbackPoint = (seed) => {
  const text = String(seed ?? "0");
  let hash = 7;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 1_000_003;
  }
  const angle = ((hash % 360) * Math.PI) / 180;
  const distanceKm = 0.4 + ((hash % 1000) / 1000) * (LOGISTICS.serviceRadiusKm - 0.6);
  const dLat = (distanceKm / 111) * Math.cos(angle);
  const dLon =
    (distanceKm / (111 * Math.cos((LOGISTICS.kitchen.lat * Math.PI) / 180))) *
    Math.sin(angle);
  return {
    lat: Number((LOGISTICS.kitchen.lat + dLat).toFixed(6)),
    lon: Number((LOGISTICS.kitchen.lon + dLon).toFixed(6)),
    fallback: true,
  };
};

export const addressPoint = (address) => {
  if (!address) return null;
  const lat = address.lat ?? address.current_lat;
  const lon = address.lon ?? address.current_lon;
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))) {
    return { lat: Number(lat), lon: Number(lon), fallback: false };
  }
  return fallbackPoint(address.id_address ?? address.id ?? address.street);
};

export const kitchenPoint = () => ({
  lat: LOGISTICS.kitchen.lat,
  lon: LOGISTICS.kitchen.lon,
  fallback: false,
});

const matrixCache = new Map();

const cacheKey = (points) =>
  points.map((p) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).join("|");

export const buildMatrix = (points) => {
  const key = cacheKey(points);
  const cached = matrixCache.get(key);
  const now = Date.now();
  if (cached && now - cached.createdAt < LOGISTICS.matrixCacheMinutes * 60_000) {
    return cached.matrix;
  }

  const size = points.length;
  const distance = Array.from({ length: size }, () => new Array(size).fill(0));
  const minutes = Array.from({ length: size }, () => new Array(size).fill(0));

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      if (i === j) continue;
      const km = roadDistanceKm(points[i], points[j]);
      distance[i][j] = km;
      minutes[i][j] = travelMinutes(km);
    }
  }

  const matrix = { distance, minutes };
  matrixCache.set(key, { createdAt: now, matrix });
  if (matrixCache.size > 200) {
    const oldest = [...matrixCache.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt,
    )[0];
    if (oldest) matrixCache.delete(oldest[0]);
  }
  return matrix;
};

export const clearMatrixCache = () => matrixCache.clear();
