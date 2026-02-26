import express, { type Response } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";

const router: express.Router = express.Router();

// All notification routes require authentication (any role)
router.use(authenticate);

// GET /notifications — list user's notifications
router.get(
  "/",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      const unreadCount = await prisma.notification.count({
        where: { userId: req.user!.userId, read: false },
      });
      res.json({ notifications, unreadCount });
    } catch (error) {
      console.error("Notifications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// PATCH /notifications/read-all — mark all as read
router.patch(
  "/read-all",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.userId, read: false },
        data: { read: true },
      });
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// PATCH /notifications/:id/read — mark single notification as read
router.patch(
  "/:id/read",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      await prisma.notification.update({
        where: { id },
        data: { read: true },
      });
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
