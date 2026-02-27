import { PrismaClient } from "@prisma/client";

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
    // Connection will be re-established automatically
  }
}, KEEP_ALIVE_INTERVAL);

/**
 * Retry wrapper for Prisma operations that may fail due to Neon connection drops.
 * Retries once on "Server has closed the connection" / ECONNRESET.
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const msg = String(err?.message ?? "");
    if (retries > 0 && (msg.includes("closed the connection") || msg.includes("ECONNRESET"))) {
      // Wait briefly then retry
      await new Promise((r) => setTimeout(r, 300));
      return withRetry(fn, retries - 1);
    }
    throw err;
  }
}

export default prisma;
