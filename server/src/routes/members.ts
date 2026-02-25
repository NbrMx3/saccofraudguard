import express, { type Response } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, authorize, type AuthRequest } from "../middleware/auth.js";
import { generateMemberId } from "../utils/generateMemberId.js";

const router: express.Router = express.Router();

// ─── POST /api/members — Create a new member ───────────────────────────
router.post(
  "/",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { fullName, email, phoneNumber } = req.body;

      if (!fullName || !email || !phoneNumber) {
        res.status(400).json({ error: "Full name, email and phone number are required" });
        return;
      }

      const nameParts = fullName.trim().split(/\s+/);
      if (nameParts.length < 2) {
        res.status(400).json({ error: "Full name must include first and last name" });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: "Invalid email address" });
        return;
      }

      const phoneRegex = /^\+?\d{10,15}$/;
      if (!phoneRegex.test(phoneNumber.replace(/[\s-]/g, ""))) {
        res.status(400).json({ error: "Invalid phone number" });
        return;
      }

      const existingEmail = await prisma.member.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingEmail) {
        res.status(409).json({ error: "A member with this email already exists" });
        return;
      }

      const memberId = await generateMemberId(fullName);

      const member = await prisma.member.create({
        data: {
          memberId,
          fullName: fullName.trim(),
          email: email.toLowerCase().trim(),
          phoneNumber: phoneNumber.trim(),
          createdById: req.user!.userId,
        },
        select: {
          id: true,
          memberId: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          status: true,
          createdAt: true,
        },
      });

      res.status(201).json({ message: "Member created successfully", member });
    } catch (error) {
      console.error("Create member error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/members — List members with pagination, search & filter ──
router.get(
  "/",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = 20;
      const skip = (page - 1) * limit;
      const search = (req.query.search as string)?.trim() || "";
      const status = req.query.status as string | undefined;

      const where: Record<string, unknown> = {};

      if (search) {
        where.OR = [
          { memberId: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      if (status && ["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
        where.status = status;
      }

      const [members, total] = await Promise.all([
        prisma.member.findMany({
          where,
          select: {
            id: true,
            memberId: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.member.count({ where }),
      ]);

      res.json({
        members,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("List members error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/members/stats — Member status counts ─────────────────────
router.get(
  "/stats",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const [active, inactive, suspended] = await Promise.all([
        prisma.member.count({ where: { status: "ACTIVE" } }),
        prisma.member.count({ where: { status: "INACTIVE" } }),
        prisma.member.count({ where: { status: "SUSPENDED" } }),
      ]);

      res.json({ active, inactive, suspended });
    } catch (error) {
      console.error("Member stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/members/:id — Get single member ──────────────────────────
router.get(
  "/:id",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const member = await prisma.member.findUnique({
        where: { id },
        select: {
          id: true,
          memberId: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      if (!member) {
        res.status(404).json({ error: "Member not found" });
        return;
      }

      res.json({ member });
    } catch (error) {
      console.error("Get member error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PATCH /api/members/:id/status — Change member status ──────────────
router.patch(
  "/:id/status",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status } = req.body;

      if (!status || !["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
        res.status(400).json({ error: "Status must be ACTIVE, INACTIVE or SUSPENDED" });
        return;
      }

      const id = req.params.id as string;
      const existing = await prisma.member.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        res.status(404).json({ error: "Member not found" });
        return;
      }

      const member = await prisma.member.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          memberId: true,
          fullName: true,
          status: true,
        },
      });

      res.json({ message: "Status updated successfully", member });
    } catch (error) {
      console.error("Update member status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── DELETE /api/members/:id — Delete a member ─────────────────────────
router.delete(
  "/:id",
  authenticate,
  authorize("OFFICER", "ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const existing = await prisma.member.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        res.status(404).json({ error: "Member not found" });
        return;
      }

      await prisma.member.delete({ where: { id } });

      res.json({ message: "Member deleted successfully" });
    } catch (error) {
      console.error("Delete member error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
