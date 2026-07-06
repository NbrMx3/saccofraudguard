import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";
import prisma, { withRetry } from "../lib/prisma.js";

const AUTH_CACHE_TTL_MS = Number(process.env.AUTH_CACHE_TTL_MS || 30000);
const AUTH_CACHE_MAX_SIZE = Number(process.env.AUTH_CACHE_MAX_SIZE || 10000);

interface CachedAuthUser {
  id: string;
  nationalId: string;
  role: string;
  isActive: boolean;
  expiresAt: number;
}

const authUserCache = new Map<string, CachedAuthUser>();

function getCachedAuthUser(userId: string): CachedAuthUser | null {
  const cached = authUserCache.get(userId);
  if (!cached) return null;

  if (cached.expiresAt < Date.now()) {
    authUserCache.delete(userId);
    return null;
  }

  return cached;
}

function setCachedAuthUser(user: Omit<CachedAuthUser, "expiresAt">): void {
  if (authUserCache.size >= AUTH_CACHE_MAX_SIZE) {
    const oldestKey = authUserCache.keys().next().value;
    if (oldestKey) authUserCache.delete(oldestKey);
  }

  authUserCache.set(user.id, {
    ...user,
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
  });
}

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

  const cachedUser = getCachedAuthUser(payload!.userId);
  if (cachedUser) {
    if (!cachedUser.isActive) {
      authUserCache.delete(payload!.userId);
      res.status(403).json({ error: "Account has been deactivated" });
      return;
    }

    req.user = {
      userId: cachedUser.id,
      nationalId: cachedUser.nationalId,
      role: cachedUser.role,
    };
    next();
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

    setCachedAuthUser({
      id: user.id,
      nationalId: user.nationalId,
      role: user.role,
      isActive: user.isActive,
    });

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
