import { db } from "../config/db.js";
import { buildRoutePlan } from "./routingPlan.js";

export { buildRoutePlan };

export const courierOrders = async (courierId) => {
  const [rows] = await db.execute(
    `SELECT o.id_order, o.id_address, o.order_date, o.status, o.promised_time,
            a.street, a.building, a.lat, a.lon
       FROM orders o
       JOIN address a ON a.id_address = o.id_address
      WHERE o.id_courier = ?
        AND o.status IN ('created', 'cooking', 'on_way', 'delivering')
      ORDER BY o.promised_time IS NULL, o.promised_time ASC`,
    [courierId],
  );
  return rows;
};

export const saveRoute = async (courierId, plan) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      "UPDATE routes SET status = 'done' WHERE id_courier = ? AND status = 'planned'",
      [courierId],
    );

    const [routeResult] = await connection.execute(
      `INSERT INTO routes
         (id_courier, route_date, status, total_distance, total_duration, planned_start, planned_end)
       VALUES (?, CURDATE(), 'planned', ?, ?, ?, ?)`,
      [
        courierId,
        plan.totalDistanceKm,
        plan.totalDurationMin,
        plan.plannedStart ? plan.plannedStart.slice(0, 19).replace("T", " ") : null,
        plan.plannedEnd ? plan.plannedEnd.slice(0, 19).replace("T", " ") : null,
      ],
    );
    const routeId = routeResult.insertId;

    for (const point of plan.points) {
      const planned = point.planned_arrival
        ? new Date(point.planned_arrival).toISOString().slice(0, 19).replace("T", " ")
        : null;

      await connection.execute(
        `INSERT INTO route_points
           (id_route, id_order, sequence, point_type, lat, lon, planned_arrival,
            distance_from_prev, duration_from_prev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          routeId,
          point.id_order,
          point.sequence,
          point.type,
          point.lat,
          point.lon,
          planned,
          point.distance_from_prev,
          point.duration_from_prev,
        ],
      );
    }

    await connection.commit();
    return routeId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const planForCourier = async (courierId) => {
  const orders = await courierOrders(courierId);
  const plan = buildRoutePlan(orders);
  return { orders, plan };
};
