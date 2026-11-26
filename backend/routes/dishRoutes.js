import express from "express";
import {
  getAllDishes,
  getCategories,
  getDishById,
} from "../controllers/dishController.js";

const router = express.Router();

router.get("/", getAllDishes);
router.get("/categories", getCategories);
router.get("/:id", getDishById);

export default router;
