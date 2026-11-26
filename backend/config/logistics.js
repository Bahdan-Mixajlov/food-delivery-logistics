const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const LOGISTICS = {
  kitchen: {
    name: process.env.KITCHEN_NAME || "Кухня",
    lat: number(process.env.KITCHEN_LAT, 53.6688),
    lon: number(process.env.KITCHEN_LON, 23.8228),
  },
  serviceRadiusKm: number(process.env.SERVICE_RADIUS_KM, 6),

  assignRadiusKm: number(process.env.ASSIGN_RADIUS_KM, 3),
  maxActiveOrders: number(process.env.MAX_ACTIVE_ORDERS, 3),
  courierResponseSeconds: number(process.env.COURIER_RESPONSE_SECONDS, 30),
  weights: {
    travel: number(process.env.WEIGHT_TRAVEL, 0.4),
    load: number(process.env.WEIGHT_LOAD, 0.25),
    delayRisk: number(process.env.WEIGHT_DELAY, 0.25),
    rating: number(process.env.WEIGHT_RATING, 0.1),
  },

  routeMaxPoints: number(process.env.ROUTE_MAX_POINTS, 12),
  improveIterations: number(process.env.ROUTE_IMPROVE_ITERATIONS, 100),
  timeWindowDeviationMin: number(process.env.TIME_WINDOW_DEVIATION_MIN, 10),
  averageSpeedKmh: number(process.env.AVERAGE_SPEED_KMH, 25),
  serviceMinutes: number(process.env.SERVICE_MINUTES, 5),
  cookingMinutes: number(process.env.COOKING_MINUTES, 20),
  matrixCacheMinutes: number(process.env.MATRIX_CACHE_MINUTES, 15),
  roadElongation: number(process.env.ROAD_ELONGATION, 1.25),

  plannerIntervalSeconds: number(process.env.PLANNER_INTERVAL_SECONDS, 30),

  activeStatuses: ["created", "cooking", "on_way"],
};

export const COURIER_STATUSES = ["offline", "available", "busy"];
