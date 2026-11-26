import { LOGISTICS } from "../config/logistics.js";
import {
  addressPoint,
  buildMatrix,
  kitchenPoint,
} from "./geoService.js";

const buildPoints = (orders) => {
  const kitchen = kitchenPoint();
  return [
    {
      type: "kitchen",
      id_order: null,
      lat: kitchen.lat,
      lon: kitchen.lon,
      label: LOGISTICS.kitchen.name,
    },
    ...orders.map((order) => {
      const point = addressPoint(order);
      return {
        type: "delivery",
        id_order: order.id_order,
        lat: point.lat,
        lon: point.lon,
        label: `${order.street ?? ""} ${order.building ?? ""}`.trim(),
        promisedTime: order.promised_time ? new Date(order.promised_time) : null,
        readyAt: new Date(
          new Date(order.order_date ?? Date.now()).getTime() +
            LOGISTICS.cookingMinutes * 60_000,
        ),
      };
    }),
  ];
};

const windowEnd = (point) =>
  point.promisedTime
    ? point.promisedTime.getTime() + LOGISTICS.timeWindowDeviationMin * 60_000
    : Number.POSITIVE_INFINITY;

export const evaluateSequence = (sequence, points, matrix, departureAt) => {
  let time = departureAt;
  let distanceKm = 0;
  let durationMin = 0;
  let lateness = 0;
  const schedule = [];

  for (let i = 1; i < sequence.length; i += 1) {
    const from = sequence[i - 1];
    const to = sequence[i];
    const travelMin = matrix.minutes[from][to];
    const km = matrix.distance[from][to];
    time += travelMin * 60_000;
    distanceKm += km;
    durationMin += travelMin;

    const point = points[to];
    if (point.type === "delivery") {
      const late = Math.max(0, time - windowEnd(point));
      lateness += late;
      schedule.push({ index: to, arrival: time, late });
      time += LOGISTICS.serviceMinutes * 60_000;
      durationMin += LOGISTICS.serviceMinutes;
    }
  }

  return {
    sequence: [...sequence],
    distanceKm,
    durationMin,
    lateness,
    feasible: lateness <= 0,
    schedule,
    arrivalAt: time,
  };
};

const better = (candidate, best) => {
  if (candidate.feasible !== best.feasible) return candidate.feasible;
  if (candidate.lateness !== best.lateness) return candidate.lateness < best.lateness;
  return candidate.distanceKm < best.distanceKm - 1e-9;
};

export const insertionRoute = (points, matrix, departureAt) => {
  const sequence = [0];
  const remaining = points.map((_, index) => index).filter((index) => index !== 0);

  while (remaining.length > 0) {
    let best = null;
    for (const pointIndex of remaining) {
      for (let position = 1; position <= sequence.length; position += 1) {
        const candidate = [
          ...sequence.slice(0, position),
          pointIndex,
          ...sequence.slice(position),
        ];
        const score = evaluateSequence(candidate, points, matrix, departureAt);
        if (!best || better(score, best.score)) {
          best = { score, sequence: candidate, pointIndex };
        }
      }
    }
    sequence.splice(0, sequence.length, ...best.sequence);
    remaining.splice(remaining.indexOf(best.pointIndex), 1);
  }

  return evaluateSequence(sequence, points, matrix, departureAt);
};

export const savingsRoute = (points, matrix, departureAt) => {
  const deliveries = points.map((_, index) => index).filter((index) => index !== 0);
  if (deliveries.length <= 1) {
    return evaluateSequence([0, ...deliveries], points, matrix, departureAt);
  }

  const savings = [];
  for (let i = 0; i < deliveries.length; i += 1) {
    for (let j = i + 1; j < deliveries.length; j += 1) {
      const a = deliveries[i];
      const b = deliveries[j];
      savings.push({
        a,
        b,
        value: matrix.distance[0][a] + matrix.distance[0][b] - matrix.distance[a][b],
      });
    }
  }
  savings.sort((x, y) => y.value - x.value);

  const routes = deliveries.map((point) => [point]);
  const routeOf = new Map(deliveries.map((point, index) => [point, index]));

  for (const { a, b } of savings) {
    const routeA = routes[routeOf.get(a)];
    const routeB = routes[routeOf.get(b)];
    if (!routeA || !routeB || routeA === routeB) continue;
    const endA = routeA[routeA.length - 1] === a;
    const startA = routeA[0] === a;
    const endB = routeB[routeB.length - 1] === b;
    const startB = routeB[0] === b;
    if (!(endA && startB) && !(endB && startA)) continue;

    const merged = endA && startB ? [...routeA, ...routeB] : [...routeB, ...routeA];
    const keep = routeOf.get(a);
    const drop = routeOf.get(b);
    routes[keep] = merged;
    routes[drop] = [];
    for (const point of merged) routeOf.set(point, keep);
  }

  const order = routes.find((route) => route.length > 0) ?? deliveries;
  return evaluateSequence([0, ...order], points, matrix, departureAt);
};

export const improveRoute = (initial, points, matrix, departureAt) => {
  let best = initial;
  let iterations = 0;
  let improved = true;

  while (improved && iterations < LOGISTICS.improveIterations) {
    improved = false;
    const { sequence } = best;

    for (let i = 1; i < sequence.length - 1 && iterations < LOGISTICS.improveIterations; i += 1) {
      for (let j = i + 1; j < sequence.length && iterations < LOGISTICS.improveIterations; j += 1) {
        iterations += 1;
        const candidate = [
          ...sequence.slice(0, i),
          ...sequence.slice(i, j + 1).reverse(),
          ...sequence.slice(j + 1),
        ];
        const score = evaluateSequence(candidate, points, matrix, departureAt);
        if (better(score, best)) {
          best = score;
          improved = true;
        }
      }
    }

    for (let i = 1; i < sequence.length - 1 && iterations < LOGISTICS.improveIterations; i += 1) {
      for (let j = i + 1; j < sequence.length && iterations < LOGISTICS.improveIterations; j += 1) {
        iterations += 1;
        const candidate = [...sequence];
        [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
        const score = evaluateSequence(candidate, points, matrix, departureAt);
        if (better(score, best)) {
          best = score;
          improved = true;
        }
      }
    }
  }

  return { ...best, iterations };
};

export const buildRoutePlan = (orders, options = {}) => {
  const limited = [...orders]
    .sort((a, b) => {
      const left = a.promised_time ? new Date(a.promised_time).getTime() : Infinity;
      const right = b.promised_time ? new Date(b.promised_time).getTime() : Infinity;
      return left - right;
    })
    .slice(0, LOGISTICS.routeMaxPoints - 1);

  if (limited.length === 0) {
    return {
      points: [],
      schedule: [],
      totalDistanceKm: 0,
      totalDurationMin: 0,
      feasible: true,
      violations: 0,
      iterations: 0,
      plannedStart: null,
      plannedEnd: null,
    };
  }

  const points = buildPoints(limited);
  const matrix = buildMatrix(points);

  const departure = options.departureAt
    ? new Date(options.departureAt).getTime()
    : Math.max(
        Date.now(),
        ...points
          .filter((point) => point.type === "delivery")
          .map((point) => point.readyAt.getTime()),
      );

  const byInsertion = insertionRoute(points, matrix, departure);
  const bySavings = savingsRoute(points, matrix, departure);
  const start = better(bySavings, byInsertion) ? bySavings : byInsertion;
  const result = improveRoute(start, points, matrix, departure);

  const startDate = new Date(departure);
  const endDate = new Date(departure + result.durationMin * 60_000);
  const arrivalByIndex = new Map(
    (result.schedule ?? []).map((item) => [item.index, item.arrival]),
  );

  return {
    points: result.sequence.map((pointIndex, position) => {
      const point = points[pointIndex];
      const previous = position === 0 ? null : result.sequence[position - 1];
      const arrivalMs = arrivalByIndex.get(pointIndex);
      return {
        sequence: position,
        type: point.type,
        id_order: point.id_order,
        label: point.label,
        lat: point.lat,
        lon: point.lon,
        planned_arrival:
          position === 0
            ? startDate.toISOString()
            : arrivalMs
              ? new Date(arrivalMs).toISOString()
              : null,
        distance_from_prev:
          previous === null
            ? 0
            : Number(matrix.distance[previous][pointIndex].toFixed(2)),
        duration_from_prev:
          previous === null
            ? 0
            : Math.round(matrix.minutes[previous][pointIndex]),
      };
    }),
    schedule: result.schedule,
    totalDistanceKm: Number(result.distanceKm.toFixed(2)),
    totalDurationMin: Math.round(result.durationMin),
    feasible: result.feasible,
    violations: Number((result.lateness / 60_000).toFixed(1)),
    iterations: result.iterations,
    plannedStart: startDate.toISOString(),
    plannedEnd: endDate.toISOString(),
  };
};
