import { Router } from "express";
import notificationRoutes from "./notification.routes";

const router = Router();

// Routes des notifications
router.use("/", notificationRoutes);

export default router;
