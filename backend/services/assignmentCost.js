import { LOGISTICS } from "../config/logistics.js";
import {
  addressPoint,
  kitchenPoint,
  roadDistanceKm,
  travelMinutes,
} from "./geoService.js";
import { solveAssignment, solveSingle } from "./hungarian.js";

const normalize = (value, max) => Math.min(Math.max(value, 0), max) / max;

export const courierPoint = (courier) => {
  const lat = Number(courier.current_lat);
  const lon = Number(courier.current_lon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  return addressPoint({ id_address: `courier-${courier.id_courier}` });
};

export const assignmentCost = (order, courier) => {
  const kitchen = kitchenPoint();
  const fromCourier = courierPoint(courier);
  const toClient = addressPoint(order);
  const toKitchenKm = roadDistanceKm(fromCourier, kitchen);
  const toClientKm = roadDistanceKm(kitchen, toClient);

  const travel = travelMinutes(toKitchenKm) + travelMinutes(toClientKm);
  const load = courier.active_orders ?? 0;
  const rating = Number(courier.rating ?? 5);

  const readyAt = new Date(order.order_date ?? Date.now());
  readyAt.setMinutes(readyAt.getMinutes() + LOGISTICS.cookingMinutes);
  const promised = order.promised_time ? new Date(order.promised_time) : null;
  const predicted = new Date(
    Math.max(readyAt.getTime(), Date.now()) + travel * 60_000,
  );
  const delayMinutes = promised ? Math.max(0, (predicted - promised) / 60_000) : 0;

  const { weights } = LOGISTICS;
  const cost =
    weights.travel * normalize(travel, 60) +
    weights.load * normalize(load, LOGISTICS.maxActiveOrders) +
    weights.delayRisk * normalize(delayMinutes, 30) +
    weights.rating * normalize(5 - rating, 5);

  return {
    cost: Number(cost.toFixed(4)),
    travelMinutes: Number(travel.toFixed(1)),
    distanceKm: Number((toKitchenKm + toClientKm).toFixed(2)),
    delayMinutes: Number(delayMinutes.toFixed(1)),
    load,
  };
};

export const isEligible = (order, courier) => {
  if ((courier.active_orders ?? 0) >= LOGISTICS.maxActiveOrders) return false;
  const distanceKm = roadDistanceKm(courierPoint(courier), kitchenPoint());
  return distanceKm <= LOGISTICS.assignRadiusKm;
};

export const buildOffers = (orders, couriers) => {
  const eligibleCouriers = couriers.filter((courier) => courier.status === "available");
  if (eligibleCouriers.length === 0 || orders.length === 0) return [];

  const matrix = orders.map((order) =>
    eligibleCouriers.map((courier) =>
      isEligible(order, courier)
        ? assignmentCost(order, courier).cost
        : Number.POSITIVE_INFINITY,
    ),
  );

  const indexes =
    orders.length === 1 ? [solveSingle(matrix[0])] : solveAssignment(matrix);

  const offers = [];
  indexes.forEach((courierIndex, orderIndex) => {
    if (courierIndex < 0) return;
    const courier = eligibleCouriers[courierIndex];
    const order = orders[orderIndex];
    if (!isEligible(order, courier)) return;
    offers.push({
      order,
      courier,
      ...assignmentCost(order, courier),
    });
  });
  return offers;
};
