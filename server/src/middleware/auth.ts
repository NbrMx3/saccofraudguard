import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";
import prisma, { withRetry } from "../lib/prisma.js";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    nationalId: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Check Authorization header first, then fall back to cookie
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    token = req.cookies?.token;
  }

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  let payload: AuthRequest["user"];
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  try {
    const user = await withRetry(() => prisma.user.findUnique({
      where: { id: payload!.userId },
      select: {
        id: true,
        nationalId: true,
        role: true,
        isActive: true,
      },
    }));

    if (!user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Account has been deactivated" });
      return;
    }

    req.user = {
      userId: user.id,
      nationalId: user.nationalId,
      role: user.role,
    };
    next();
  } catch (error) {
    console.error("Authentication lookup error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
