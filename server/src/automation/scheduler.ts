/**
 * Automation Scheduler
 * Registers and runs all automated jobs using node-cron.
 * Each job is tracked via automationState for monitoring.
 */
import cron from "node-cron";
import {
  initJob,
  recordJobStart,
  recordJobSuccess,
  recordJobError,
  setNextRun,
  getJobState,
  setJobEnabled,
} from "./automationState.js";
import { runFraudRuleScan } from "./jobs/fraudRuleScan.js";
import { runRiskScoreCalculation } from "./jobs/riskScoreCalculation.js";
import { runDecisionEvaluation } from "./jobs/decisionEvaluation.js";
import { runAlertDigest } from "./jobs/alertDigest.js";
import { runLoanMonitoring } from "./jobs/loanMonitoring.js";

// ── Job definitions ──────────────────────────────────────────────
interface JobDef {
  name: string;
  schedule: string; // cron expression
  description: string;
  handler: () => Promise<string>;
}

const JOB_DEFINITIONS: JobDef[] = [
  {
    name: "fraud-rule-scan",
    schedule: "*/15 * * * *", // every 15 minutes
    description: "Every 15 minutes",
    handler: runFraudRuleScan,
  },
  {
    name: "risk-score-calculation",
    schedule: "0 */2 * * *", // every 2 hours
    description: "Every 2 hours",
    handler: runRiskScoreCalculation,
  },
  {
    name: "decision-evaluation",
    schedule: "30 */2 * * *", // every 2 hours at :30
    description: "Every 2 hours (offset)",
    handler: runDecisionEvaluation,
  },
  {
    name: "alert-digest",
    schedule: "0 8 * * *", // daily at 8 AM
    description: "Daily at 8:00 AM",
    handler: runAlertDigest,
  },
  {
    name: "loan-monitoring",
    schedule: "0 6 * * *", // daily at 6 AM
    description: "Daily at 6:00 AM",
    handler: runLoanMonitoring,
  },
];

// Store cron tasks so we can stop/start them
const cronTasks: Map<string, cron.ScheduledTask> = new Map();

function calculateNextRun(cronExpr: string): Date {
  // Simple next-run estimation from cron expression
  // node-cron doesn't expose a next-run API, so we estimate
  const now = new Date();
  const parts = cronExpr.split(" ");

  // For "*/N * * * *" (every N minutes)
  if (parts[0].startsWith("*/")) {
    const interval = parseInt(parts[0].replace("*/", ""));
    const nextMinute = Math.ceil((now.getMinutes() + 1) / interval) * interval;
    const next = new Date(now);
    if (nextMinute >= 60) {
      next.setHours(next.getHours() + 1);
      next.setMinutes(nextMinute - 60);
    } else {
      next.setMinutes(nextMinute);
    }
    next.setSeconds(0);
    next.setMilliseconds(0);
    return next;
  }

  // For "N */H * * *" (every H hours at minute N)
  if (parts[1].startsWith("*/")) {
    const minute = parseInt(parts[0]);
    const interval = parseInt(parts[1].replace("*/", ""));
    const next = new Date(now);
    const nextHour = Math.ceil((now.getHours() + 1) / interval) * interval;
    if (nextHour >= 24) {
      next.setDate(next.getDate() + 1);
      next.setHours(nextHour - 24);
    } else {
      next.setHours(nextHour);
    }
    next.setMinutes(minute);
    next.setSeconds(0);
    next.setMilliseconds(0);
    return next;
  }

  // For "M H * * *" (daily at H:M)
  if (!parts[0].includes("*") && !parts[1].includes("*")) {
    const minute = parseInt(parts[0]);
    const hour = parseInt(parts[1]);
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }

  // Fallback: next hour
  const next = new Date(now);
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next;
}

async function executeJob(job: JobDef) {
  const state = getJobState(job.name);
  if (state && !state.enabled) return; // Skip disabled jobs

  const startTime = Date.now();
  recordJobStart(job.name);

  try {
    const result = await job.handler();
    const duration = Date.now() - startTime;
    const nextRun = calculateNextRun(job.schedule);
    recordJobSuccess(job.name, result, duration, nextRun);
    console.log(
      `[Automation] ✓ ${job.name} completed in ${duration}ms — ${result}`
    );
  } catch (err: any) {
    const duration = Date.now() - startTime;
    recordJobError(job.name, err.message || String(err), duration);
    console.error(`[Automation] ✗ ${job.name} failed in ${duration}ms —`, err.message);
  }
}

// ── Public API ───────────────────────────────────────────────────

/** Start all automated jobs */
export function startAutomation() {
  console.log("[Automation] Starting automated jobs...");

  for (const job of JOB_DEFINITIONS) {
    initJob(job.name, job.description, true);
    setNextRun(job.name, calculateNextRun(job.schedule));

    const task = cron.schedule(job.schedule, () => {
      executeJob(job);
    });

    cronTasks.set(job.name, task);
    console.log(`[Automation]   → ${job.name} (${job.description})`);
  }

  console.log(`[Automation] ${JOB_DEFINITIONS.length} jobs registered and running.`);
}

/** Stop all automated jobs */
export function stopAutomation() {
  for (const [name, task] of cronTasks) {
    task.stop();
    console.log(`[Automation] Stopped ${name}`);
  }
  cronTasks.clear();
}

/** Enable/disable a specific job */
export function toggleJob(jobName: string, enabled: boolean) {
  const task = cronTasks.get(jobName);
  if (task) {
    if (enabled) {
      task.start();
      setNextRun(jobName, calculateNextRun(
        JOB_DEFINITIONS.find((j) => j.name === jobName)?.schedule || "0 * * * *"
      ));
    } else {
      task.stop();
    }
    setJobEnabled(jobName, enabled);
  }
}

/** Manually trigger a job immediately */
export async function triggerJob(jobName: string): Promise<string> {
  const job = JOB_DEFINITIONS.find((j) => j.name === jobName);
  if (!job) throw new Error(`Unknown job: ${jobName}`);

  const state = getJobState(jobName);
  if (state && !state.enabled) {
    throw new Error(`Job ${jobName} is disabled`);
  }

  await executeJob(job);
  const result = getJobState(jobName);
  return result?.lastResult || "Completed";
}

/** Get all job names */
export function getJobNames(): string[] {
  return JOB_DEFINITIONS.map((j) => j.name);
}
