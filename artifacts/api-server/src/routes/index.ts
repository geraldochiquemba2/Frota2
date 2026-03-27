import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import vehiclesRouter from "./vehicles";
import tripsRouter from "./trips";
import fuelingsRouter from "./fuelings";
import maintenanceRouter from "./maintenance";
import inventoryRouter from "./inventory";
import suppliersRouter from "./suppliers";
import financeRouter from "./finance";
import reportsRouter from "./reports";
import { requireAdmin, requireAuth } from "../middlewares/rbac";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

// Protected routes - Auth required for all
router.use(requireAuth);

// Admin-only routes
router.use("/users", requireAdmin, usersRouter);
router.use("/vehicles", vehiclesRouter);
router.use("/fuelings", requireAdmin, fuelingsRouter);
router.use("/maintenance", requireAdmin, maintenanceRouter);
router.use("/inventory", requireAdmin, inventoryRouter);
router.use("/suppliers", requireAdmin, suppliersRouter);
router.use("/finance", requireAdmin, financeRouter);
router.use("/reports", requireAdmin, reportsRouter);
router.use("/dashboard", requireAdmin, reportsRouter);

// Role-mixed routes (internal logic handles roles)
router.use("/trips", tripsRouter);

export default router;
