import test from "node:test";
import assert from "node:assert/strict";

import { solveAssignment, solveSingle } from "../services/hungarian.js";
import {
  haversineKm,
  roadDistanceKm,
  travelMinutes,
} from "../services/geoService.js";
import { buildRoutePlan } from "../services/routingPlan.js";
import { assignmentCost, buildOffers, isEligible } from "../services/assignmentCost.js";
import { LOGISTICS } from "../config/logistics.js";

test("венгерский метод: квадратная матрица", () => {
  const assignment = solveAssignment([
    [4, 1, 3],
    [2, 0, 5],
    [3, 2, 2],
  ]);
  assert.deepEqual(assignment, [1, 0, 2]);
});

test("венгерский метод: заказов больше, чем курьеров", () => {
  const assignment = solveAssignment([
    [1, 9],
    [9, 1],
    [5, 5],
  ]);
  assert.equal(assignment.length, 3);
  assert.equal(assignment[0], 0);
  assert.equal(assignment[1], 1);
  assert.equal(assignment.filter((value) => value >= 0).length, 2);
});

test("выбор минимальной стоимости для одного заказа", () => {
  assert.equal(solveSingle([0.9, 0.2, 0.5]), 1);
  assert.equal(solveSingle([]), -1);
});

test("расстояние по прямой и время в пути", () => {
  const kitchen = { lat: 53.6688, lon: 23.8228 };
  const client = { lat: 53.6688, lon: 23.8328 };
  const straight = haversineKm(kitchen, client);
  assert.ok(straight > 0.6 && straight < 0.7);
  assert.ok(roadDistanceKm(kitchen, client) > straight);
  const minutes = travelMinutes(5);
  assert.equal(Math.round(minutes), 12);
});

test("маршрут: кухня и адреса, порядок и расстояния", () => {
  const now = Date.now();
  const orders = [
    {
      id_order: 1,
      street: "Ожешко",
      building: "22",
      order_date: new Date(now - 25 * 60_000),
      promised_time: new Date(now + 40 * 60_000),
      lat: 53.677,
      lon: 23.829,
    },
    {
      id_order: 2,
      street: "Клецкова",
      building: "12",
      order_date: new Date(now - 20 * 60_000),
      promised_time: new Date(now + 30 * 60_000),
      lat: 53.662,
      lon: 23.811,
    },
  ];

  const plan = buildRoutePlan(orders, { departureAt: new Date(now) });
  assert.equal(plan.points.length, 3);
  assert.equal(plan.points[0].type, "kitchen");
  assert.equal(plan.points[1].type, "delivery");
  assert.ok(plan.totalDistanceKm > 0);
  assert.ok(plan.totalDurationMin > 0);
  assert.ok(plan.iterations <= LOGISTICS.improveIterations);
});

test("маршрут: число точек ограничено параметром", () => {
  const now = Date.now();
  const orders = Array.from({ length: 20 }, (_, index) => ({
    id_order: index + 1,
    order_date: new Date(now - 30 * 60_000),
    promised_time: new Date(now + 60 * 60_000),
    lat: 53.66 + index * 0.001,
    lon: 23.81 + index * 0.001,
  }));
  const plan = buildRoutePlan(orders, { departureAt: new Date(now) });
  assert.ok(plan.points.length <= LOGISTICS.routeMaxPoints);
});

test("маршрут: пустой список заказов", () => {
  const plan = buildRoutePlan([]);
  assert.equal(plan.points.length, 0);
  assert.equal(plan.totalDistanceKm, 0);
  assert.equal(plan.feasible, true);
});

test("маршрут: время прибытия растёт по точкам", () => {
  const now = Date.now();
  const orders = [
    {
      id_order: 1,
      order_date: new Date(now - 25 * 60_000),
      promised_time: new Date(now + 120 * 60_000),
      lat: 53.677,
      lon: 23.829,
    },
    {
      id_order: 2,
      order_date: new Date(now - 25 * 60_000),
      promised_time: new Date(now + 120 * 60_000),
      lat: 53.662,
      lon: 23.811,
    },
  ];

  const plan = buildRoutePlan(orders, { departureAt: new Date(now) });
  const arrivals = plan.points.map((point) => new Date(point.planned_arrival).getTime());
  assert.equal(arrivals.length, 3);
  assert.ok(arrivals[1] > arrivals[0]);
  assert.ok(arrivals[2] > arrivals[1]);
  const firstLegMinutes = (arrivals[1] - arrivals[0]) / 60_000;
  assert.ok(firstLegMinutes >= 2 && firstLegMinutes <= 10);
  assert.ok(plan.totalDurationMin >= plan.totalDistanceKm / LOGISTICS.averageSpeedKmh * 60);
});

test("стоимость назначения растёт с загрузкой курьера", () => {
  const order = {
    id_order: 1,
    order_date: new Date(),
    promised_time: new Date(Date.now() + 45 * 60_000),
    lat: 53.677,
    lon: 23.829,
  };
  const free = assignmentCost(order, {
    id_courier: 1,
    current_lat: 53.669,
    current_lon: 23.825,
    active_orders: 0,
    rating: 5,
  });
  const loaded = assignmentCost(order, {
    id_courier: 2,
    current_lat: 53.669,
    current_lon: 23.825,
    active_orders: 3,
    rating: 3,
  });
  assert.ok(loaded.cost > free.cost);
  assert.equal(free.cost >= 0, true);
});

test("курьер вне радиуса не получает заказ", () => {
  const order = { id_order: 1, lat: 53.677, lon: 23.829 };
  const near = { id_courier: 1, current_lat: 53.669, current_lon: 23.825, active_orders: 0 };
  const far = { id_courier: 2, current_lat: 54.5, current_lon: 25.2, active_orders: 0 };
  assert.equal(isEligible(order, near), true);
  assert.equal(isEligible(order, far), false);
});

test("пакет заказов распределяется без повторов курьеров", () => {
  const now = Date.now();
  const orders = [1, 2].map((id) => ({
    id_order: id,
    order_date: new Date(now - 20 * 60_000),
    promised_time: new Date(now + 40 * 60_000),
    lat: 53.67 + id * 0.002,
    lon: 23.82 + id * 0.002,
  }));
  const couriers = [1, 2, 3].map((id) => ({
    id_courier: id,
    status: "available",
    current_lat: 53.669 + id * 0.001,
    current_lon: 23.825 + id * 0.001,
    active_orders: 0,
    rating: 5,
  }));
  const offers = buildOffers(orders, couriers);
  assert.equal(offers.length, 2);
  const courierIds = offers.map((offer) => offer.courier.id_courier);
  assert.equal(new Set(courierIds).size, courierIds.length);
});
