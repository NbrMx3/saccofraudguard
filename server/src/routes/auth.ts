import { Router, type Request, type Response, type Router as RouterType } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { sendPasswordResetEmail } from "../lib/email.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";

const router: RouterType = Router();

const isProduction = process.env.NODE_ENV === "production";

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  };
}

// POST /api/auth/signup
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  try {
    const { nationalId, email, password, confirmPassword } = req.body;

    if (!nationalId || !email || !password || !confirmPassword) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: "Passwords do not match" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      res.status(400).json({
        error:
          "Password must contain at least one uppercase, one lowercase, one number, and one special character",
      });
      return;
    }

    // Check if user with this nationalId AND email exists in the same row
    const existingUser = await prisma.user.findFirst({
      where: {
        nationalId: nationalId,
        email: email,
      },
    });

    if (!existingUser) {
      res.status(404).json({
        error:
          "No matching record found. Please ensure your User ID and Email are correct.",
      });
      return;
    }

    // Check if already has a password set (already registered)
    if (
      existingUser.password &&
      existingUser.password !== "PENDING_REGISTRATION"
    ) {
      res.status(409).json({
        error: "Account already registered. Please login instead.",
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user with password
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { password: hashedPassword },
    });

    res.status(201).json({
      message:
        "Account created successfully. Please login with your User ID and password.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { nationalId, password } = req.body;

    if (!nationalId || !password) {
      res.status(400).json({ error: "User ID and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { nationalId },
    });

    if (!user || user.password === "PENDING_REGISTRATION") {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Account has been deactivated" });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create JWT
    const token = signToken({
      userId: user.id,
      nationalId: user.nationalId,
      role: user.role,
    });

    // Set httpOnly cookie
    res.cookie("token", token, getCookieOptions());

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        nationalId: user.nationalId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { nationalId, email } = req.body;

      if (!nationalId || !email) {
        res
          .status(400)
          .json({ error: "User ID and email are required" });
        return;
      }

      const user = await prisma.user.findFirst({
        where: { nationalId, email },
      });

      if (!user) {
        // Don't reveal if user exists
        res.json({
          message:
            "If an account with those details exists, a password reset link has been sent.",
        });
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetExpires },
      });

      // Send reset email
      const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
      const resetLink = `${clientUrl}/reset-password?token=${resetToken}`;

      try {
        await sendPasswordResetEmail(user.email, resetLink, user.firstName);
      } catch (emailError) {
        console.error("Email send error:", emailError);
        // Still return success to not reveal user existence
      }

      res.json({
        message:
          "If an account with those details exists, a password reset link has been sent.",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, password, confirmPassword } = req.body;

      if (!token || !password || !confirmPassword) {
        res.status(400).json({ error: "All fields are required" });
        return;
      }

      if (password !== confirmPassword) {
        res.status(400).json({ error: "Passwords do not match" });
        return;
      }

      if (password.length < 8) {
        res
          .status(400)
          .json({ error: "Password must be at least 8 characters" });
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetExpires: { gt: new Date() },
        },
      });

      if (!user) {
        res
          .status(400)
          .json({ error: "Invalid or expired reset token" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetExpires: null,
        },
      });

      res.json({ message: "Password reset successfully. Please login." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /api/auth/me
router.get(
  "/me",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          nationalId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLogin: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ user });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    path: "/",
  });
  res.json({ message: "Logged out successfully" });
});

export default router;
