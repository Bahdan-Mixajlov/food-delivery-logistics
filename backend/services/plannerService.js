import { LOGISTICS } from "../config/logistics.js";
import {
  availableCouriers,
  buildOffers,
  expireOffers,
  pendingOrders,
  saveOffer,
} from "./assignmentService.js";

const queue = new Set();
let timer = null;
let running = false;

export const enqueueOrder = (orderId) => {
  if (orderId != null) queue.add(Number(orderId));
};

export const enqueueOrders = (orderIds = []) => {
  orderIds.forEach(enqueueOrder);
};

export const queueSize = () => queue.size;

export const clearQueue = () => queue.clear();

export const dispatch = async () => {
  if (running) return { skipped: true, offers: [], timedOut: [] };
  running = true;
  try {
    const timedOut = await expireOffers();

    const allPending = await pendingOrders();
    if (allPending.length === 0) {
      queue.clear();
      return { skipped: false, offers: [], timedOut };
    }

    const batch =
      queue.size > 0
        ? allPending.filter((order) => queue.has(Number(order.id_order)))
        : allPending;

    const orders = batch.length > 0 ? batch : allPending;
    const couriers = await availableCouriers();
    const offers = buildOffers(orders, couriers);

    const saved = [];
    for (const offer of offers) {
      const assignmentId = await saveOffer(offer);
      saved.push({
        assignmentId,
        orderId: offer.order.id_order,
        courierId: offer.courier.id_courier,
        cost: offer.cost,
        travelMinutes: offer.travelMinutes,
        delayMinutes: offer.delayMinutes,
      });
    }

    queue.clear();
    return { skipped: false, offers: saved, timedOut };
  } finally {
    running = false;
  }
};

export const startPlanner = () => {
  if (timer) return timer;
  timer = setInterval(() => {
    dispatch().catch((error) => {
      console.error("[planner]", error.message);
    });
  }, LOGISTICS.plannerIntervalSeconds * 1000);
  if (typeof timer.unref === "function") timer.unref();
  return timer;
};

export const stopPlanner = () => {
  if (timer) clearInterval(timer);
  timer = null;
};
