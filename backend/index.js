import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { db } from "./config/db.js";
import { LOGISTICS } from "./config/logistics.js";
import authRoutes from "./routes/authRoutes.js";
import dishRoutes from "./routes/dishRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import ingredientRoutes from "./routes/ingredientRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import logisticsRoutes from "./routes/logisticsRoutes.js";
import { updateProfile } from "./controllers/clientController.js";
import {
  getAddresses,
  addAddress,
  deleteAddress,
} from "./controllers/addressController.js";
import { authenticateToken } from "./middleware/authMiddleware.js";
import { startPlanner } from "./services/plannerService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/dishes", dishRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/ingredients", ingredientRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/payments", authenticateToken, paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/logistics", logisticsRoutes);
app.use("/api/orders", authenticateToken, orderRoutes);
app.use("/api/logistics", authenticateToken, logisticsRoutes);

app.put("/api/clients/:id", authenticateToken, updateProfile);
app.get("/api/addresses/:clientId", authenticateToken, getAddresses);
app.post("/api/addresses", authenticateToken, addAddress);
app.delete("/api/addresses/:id", authenticateToken, deleteAddress);

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({
      status: "ok",
      kitchen: LOGISTICS.kitchen,
      plannerIntervalSeconds: LOGISTICS.plannerIntervalSeconds,
    });
  } catch (error) {
    res.status(500).json({ status: "db_error", message: error.message });
  }
});

startPlanner();

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
