/**
 * Configuration Helper
 * Reads fraud detection thresholds from SystemConfig and WithdrawalThreshold
 * so detection behavior is configurable by users, not hardcoded.
 */
import prisma from "../lib/prisma.js";

interface FraudThresholds {
  largeDepositAmount: number;
  largeWithdrawalAmount: number;
  dailyTransactionLimit: number;
  rapidTransactionCount: number;
  rapidTransactionWindowMinutes: number;
  nearTotalWithdrawalPercent: number;
  requireApprovalAbove: number;
  maxWithdrawalsPerDay: number;
}

// In-memory cache with TTL
let cachedThresholds: FraudThresholds | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Load configurable fraud detection thresholds from the database.
 * Merges SystemConfig key-value pairs with WithdrawalThreshold record.
 * Falls back to sensible defaults if not configured.
 */
export async function getFraudThresholds(): Promise<FraudThresholds> {
  const now = Date.now();
  if (cachedThresholds && now < cacheExpiresAt) {
    return cachedThresholds;
  }

  // Load SystemConfig values
  const configs = await prisma.systemConfig.findMany();
  const configMap = new Map(configs.map((c) => [c.key, c.value]));

  // Load WithdrawalThreshold
  const wt = await prisma.withdrawalThreshold.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  const thresholds: FraudThresholds = {
    largeDepositAmount:
      parseFloat(configMap.get("large_deposit_threshold") ?? "") ||
      500000,
    largeWithdrawalAmount:
      wt?.largeWithdrawalAmount ??
      (parseFloat(configMap.get("large_withdrawal_threshold") ?? "") ||
      200000),
    dailyTransactionLimit:
      parseFloat(configMap.get("max_daily_transaction_limit") ?? "") ||
      1000000,
    rapidTransactionCount:
      parseInt(configMap.get("rapid_transaction_count") ?? "") || 5,
    rapidTransactionWindowMinutes:
      parseInt(configMap.get("rapid_transaction_window_minutes") ?? "") || 60,
    nearTotalWithdrawalPercent: 90,
    requireApprovalAbove: wt?.requireApprovalAbove ?? 500000,
    maxWithdrawalsPerDay: wt?.maxWithdrawalsPerDay ?? 5,
  };

  cachedThresholds = thresholds;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return thresholds;
}

/** Invalidate the threshold cache (call after config updates). */
export function invalidateThresholdCache() {
  cachedThresholds = null;
  cacheExpiresAt = 0;
}
