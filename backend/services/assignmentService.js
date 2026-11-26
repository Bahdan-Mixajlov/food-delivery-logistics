import { db } from "../config/db.js";
import { LOGISTICS } from "../config/logistics.js";

export { assignmentCost, buildOffers, isEligible } from "./assignmentCost.js";

export const pendingOrders = async (limit = 20) => {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.trunc(Number(limit)) : 20;
  const [rows] = await db.execute(
    `SELECT o.id_order, o.id_address, o.order_date, o.status, o.promised_time,
            a.street, a.building, a.lat, a.lon, a.apartment, a.entrance, a.floor
       FROM orders o
       JOIN address a ON a.id_address = o.id_address
      WHERE o.id_courier IS NULL
        AND o.status IN ('created', 'cooking')
      ORDER BY o.order_date ASC
      LIMIT ${safeLimit}`,
  );
  return rows;
};

export const availableCouriers = async () => {
  const [rows] = await db.execute(
    `SELECT c.id_courier, c.first_name, c.last_name, c.status, c.transport,
            c.current_lat, c.current_lon, c.rating,
            (SELECT COUNT(*) FROM orders o
              WHERE o.id_courier = c.id_courier
                AND o.status IN ('created', 'cooking', 'on_way', 'delivering')) AS active_orders
       FROM courier c
      WHERE c.status = 'available'`,
  );
  return rows.map((row) => ({
    ...row,
    active_orders: Number(row.active_orders ?? 0),
  }));
};

export const saveOffer = async (offer) => {
  const [result] = await db.execute(
    `INSERT INTO assignments (id_order, id_courier, assignment_type, cost, status)
     VALUES (?, ?, 'auto', ?, 'offered')`,
    [offer.order.id_order, offer.courier.id_courier, offer.cost],
  );
  await db.execute(
    "UPDATE orders SET id_courier = ? WHERE id_order = ? AND id_courier IS NULL",
    [offer.courier.id_courier, offer.order.id_order],
  );
  return result.insertId;
};

export const respondToOffer = async (assignmentId, courierId, accepted) => {
  const [rows] = await db.execute(
    "SELECT * FROM assignments WHERE id_assignment = ? AND id_courier = ?",
    [assignmentId, courierId],
  );
  const assignment = rows[0];
  if (!assignment) return { ok: false, reason: "not_found" };
  if (assignment.status !== "offered") return { ok: false, reason: "closed" };

  await db.execute(
    "UPDATE assignments SET status = ?, responded_at = NOW() WHERE id_assignment = ?",
    [accepted ? "accepted" : "declined", assignmentId],
  );

  if (!accepted) {
    await db.execute(
      "UPDATE orders SET id_courier = NULL WHERE id_order = ? AND status IN ('created','cooking')",
      [assignment.id_order],
    );
    return { ok: true, requeue: assignment.id_order };
  }

  return { ok: true, accepted: true };
};

export const expireOffers = async () => {
  const deadline = new Date(
    Date.now() - LOGISTICS.courierResponseSeconds * 1000,
  );
  const [rows] = await db.execute(
    `SELECT id_assignment, id_order FROM assignments
      WHERE status = 'offered' AND assigned_at < ?`,
    [deadline],
  );
  for (const row of rows) {
    await db.execute(
      "UPDATE assignments SET status = 'timeout' WHERE id_assignment = ?",
      [row.id_assignment],
    );
    await db.execute(
      "UPDATE orders SET id_courier = NULL WHERE id_order = ? AND status IN ('created','cooking')",
      [row.id_order],
    );
  }
  return rows.map((row) => row.id_order);
};
