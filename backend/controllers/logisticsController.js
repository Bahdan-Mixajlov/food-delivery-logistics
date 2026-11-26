import { LOGISTICS } from "../config/logistics.js";
import { db } from "../config/db.js";
import {
  availableCouriers,
  pendingOrders,
  respondToOffer,
} from "../services/assignmentService.js";
import { dispatch, enqueueOrder, queueSize } from "../services/plannerService.js";
import { planForCourier, saveRoute } from "../services/routingService.js";

export const getConfig = (req, res) => {
  res.json({
    kitchen: LOGISTICS.kitchen,
    assign: {
      radiusKm: LOGISTICS.assignRadiusKm,
      maxActiveOrders: LOGISTICS.maxActiveOrders,
      responseSeconds: LOGISTICS.courierResponseSeconds,
      weights: LOGISTICS.weights,
      plannerIntervalSeconds: LOGISTICS.plannerIntervalSeconds,
    },
    routing: {
      maxPoints: LOGISTICS.routeMaxPoints,
      improveIterations: LOGISTICS.improveIterations,
      timeWindowDeviationMin: LOGISTICS.timeWindowDeviationMin,
      averageSpeedKmh: LOGISTICS.averageSpeedKmh,
      serviceMinutes: LOGISTICS.serviceMinutes,
      matrixCacheMinutes: LOGISTICS.matrixCacheMinutes,
    },
    queueSize: queueSize(),
  });
};

export const runDispatch = async (req, res) => {
  try {
    const result = await dispatch();
    res.json(result);
  } catch (error) {
    console.error("[runDispatch]", error);
    res.status(500).json({ message: "Не удалось выполнить назначение" });
  }
};

export const enqueue = async (req, res) => {
  const orderId = Number(req.params.id ?? req.body?.orderId);
  if (!Number.isFinite(orderId)) {
    return res.status(400).json({ message: "Не указан заказ" });
  }
  enqueueOrder(orderId);
  res.status(202).json({ orderId, queueSize: queueSize() });
};

export const respond = async (req, res) => {
  const assignmentId = Number(req.params.id);
  const accepted = req.body?.accepted === true;
  const courierId = req.user?.role === "courier" ? req.user.id : Number(req.body?.courierId);

  if (!Number.isFinite(assignmentId) || !Number.isFinite(courierId)) {
    return res.status(400).json({ message: "Некорректные параметры ответа" });
  }

  const result = await respondToOffer(assignmentId, courierId, accepted);
  if (!result.ok) {
    return res.status(409).json({ message: "Предложение уже закрыто", reason: result.reason });
  }
  if (result.requeue) enqueueOrder(result.requeue);
  res.json(result);
};

export const getCouriers = async (req, res) => {
  const couriers = await availableCouriers();
  res.json(
    couriers.map((courier) => ({
      id: courier.id_courier,
      name: [courier.first_name, courier.last_name].filter(Boolean).join(" "),
      status: courier.status,
      transport: courier.transport,
      rating: Number(courier.rating ?? 5),
      activeOrders: Number(courier.active_orders ?? 0),
      lat: courier.current_lat,
      lon: courier.current_lon,
    })),
  );
};

export const getPending = async (req, res) => {
  const orders = await pendingOrders();
  res.json(
    orders.map((order) => ({
      id: order.id_order,
      address: `${order.street ?? ""} ${order.building ?? ""}`.trim(),
      promisedTime: order.promised_time,
      createdAt: order.order_date,
      status: order.status,
    })),
  );
};

export const getCourierRoute = async (req, res) => {
  const courierId = Number(req.params.id);
  if (!Number.isFinite(courierId)) {
    return res.status(400).json({ message: "Не указан курьер" });
  }
  try {
    const { orders, plan } = await planForCourier(courierId);
    res.json({ courierId, ordersCount: orders.length, ...plan });
  } catch (error) {
    console.error("[getCourierRoute]", error);
    res.status(500).json({ message: "Не удалось построить маршрут" });
  }
};

export const rebuildCourierRoute = async (req, res) => {
  const courierId = Number(req.params.id);
  if (!Number.isFinite(courierId)) {
    return res.status(400).json({ message: "Не указан курьер" });
  }
  try {
    const { orders, plan } = await planForCourier(courierId);
    if (plan.points.length === 0) {
      return res.json({ courierId, routeId: null, ...plan });
    }
    const routeId = await saveRoute(courierId, plan);
    res.json({ courierId, routeId, ...plan });
  } catch (error) {
    console.error("[rebuildCourierRoute]", error);
    res.status(500).json({ message: "Не удалось сохранить маршрут" });
  }
};

export const getCourierHistory = async (req, res) => {
  const courierId = Number(req.params.id);
  const [assignments] = await db.execute(
    `SELECT id_assignment, id_order, assignment_type, cost, status, assigned_at, responded_at
       FROM assignments
      WHERE id_courier = ?
      ORDER BY assigned_at DESC
      LIMIT 50`,
    [courierId],
  );
  const [routes] = await db.execute(
    `SELECT id_route, route_date, status, total_distance, total_duration, planned_start, planned_end
       FROM routes
      WHERE id_courier = ?
      ORDER BY id_route DESC
      LIMIT 20`,
    [courierId],
  );
  res.json({ assignments, routes });
};
