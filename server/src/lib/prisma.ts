import { PrismaClient } from "@prisma/client";

const MAX_RETRIES = 2;
const RETRY_DELAY = 500; // ms

function isRetryableError(err: any): boolean {
  const msg = String(err?.message ?? "");
  return (
    msg.includes("closed the connection") ||
    msg.includes("ECONNRESET") ||
    msg.includes("Connection reset") ||
    msg.includes("connection was forcibly closed") ||
    msg.includes("Can't reach database") ||
    msg.includes("Connection timed out") ||
    err?.code === "P1017" || // Server has closed the connection
    err?.code === "P1001" || // Can't reach database
    err?.code === "P1002"    // Database server timed out
  );
}

/**
 * Retry wrapper for Prisma operations that may fail due to Neon connection drops.
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries > 0 && isRetryableError(err)) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      // Reconnect before retry
      try { await prisma.$disconnect(); } catch {}
      try { await prisma.$connect(); } catch {}
      return withRetry(fn, retries - 1);
    }
    throw err;
  }
}

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

// Keep the connection alive on serverless databases (Neon)
const KEEP_ALIVE_INTERVAL = 4 * 60 * 1000; // 4 minutes
setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    // Connection will be re-established on next retry
  }
}, KEEP_ALIVE_INTERVAL);

// Ensure connection is established on startup
prisma.$connect().catch((err: any) => {
  console.error("Initial Prisma connection failed:", err.message);
});

export default prisma;
