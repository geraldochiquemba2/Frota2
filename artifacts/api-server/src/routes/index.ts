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

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/vehicles", vehiclesRouter);
router.use("/trips", tripsRouter);
router.use("/fuelings", fuelingsRouter);
router.use("/maintenance", maintenanceRouter);
router.use("/inventory", inventoryRouter);
router.use("/suppliers", suppliersRouter);
router.use("/finance", financeRouter);
router.use("/reports", reportsRouter);
router.use("/dashboard", reportsRouter);

export default router;
