import express from "express";
import {
  enqueue,
  getConfig,
  getCourierHistory,
  getCourierRoute,
  getCouriers,
  getPending,
  rebuildCourierRoute,
  respond,
  runDispatch,
} from "../controllers/logisticsController.js";

const router = express.Router();

router.get("/config", getConfig);
router.get("/couriers", getCouriers);
router.get("/pending", getPending);
router.post("/dispatch", runDispatch);
router.post("/orders/:id/enqueue", enqueue);
router.post("/assignments/:id/respond", respond);
router.get("/courier/:id/route", getCourierRoute);
router.post("/courier/:id/route/rebuild", rebuildCourierRoute);
router.get("/courier/:id/history", getCourierHistory);

export default router;
