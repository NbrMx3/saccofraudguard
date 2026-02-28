/**
 * In-memory automation state tracker.
 * Records the last run time, results, and status for each automated job.
 */

export interface JobRunResult {
  jobName: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastDuration: number | null; // ms
  lastResult: string | null;
  runCount: number;
  errorCount: number;
  lastError: string | null;
  enabled: boolean;
  schedule: string; // cron expression description
}

interface JobState {
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  lastDuration: number | null;
  lastResult: string | null;
  runCount: number;
  errorCount: number;
  lastError: string | null;
  enabled: boolean;
  schedule: string;
}

const jobStates: Map<string, JobState> = new Map();

export function initJob(jobName: string, schedule: string, enabled = true) {
  if (!jobStates.has(jobName)) {
    jobStates.set(jobName, {
      lastRunAt: null,
      nextRunAt: null,
      lastDuration: null,
      lastResult: null,
      runCount: 0,
      errorCount: 0,
      lastError: null,
      enabled,
      schedule,
    });
  }
}

export function recordJobStart(jobName: string) {
  const state = jobStates.get(jobName);
  if (state) {
    state.lastRunAt = new Date();
  }
}

export function recordJobSuccess(jobName: string, result: string, durationMs: number, nextRun?: Date) {
  const state = jobStates.get(jobName);
  if (state) {
    state.lastDuration = durationMs;
    state.lastResult = result;
    state.runCount++;
    state.lastError = null;
    if (nextRun) state.nextRunAt = nextRun;
  }
}

export function recordJobError(jobName: string, error: string, durationMs: number) {
  const state = jobStates.get(jobName);
  if (state) {
    state.lastDuration = durationMs;
    state.lastError = error;
    state.errorCount++;
    state.runCount++;
  }
}

export function setJobEnabled(jobName: string, enabled: boolean) {
  const state = jobStates.get(jobName);
  if (state) {
    state.enabled = enabled;
  }
}

export function setNextRun(jobName: string, nextRun: Date) {
  const state = jobStates.get(jobName);
  if (state) {
    state.nextRunAt = nextRun;
  }
}

export function getJobState(jobName: string): JobRunResult | null {
  const state = jobStates.get(jobName);
  if (!state) return null;
  return {
    jobName,
    lastRunAt: state.lastRunAt?.toISOString() ?? null,
    nextRunAt: state.nextRunAt?.toISOString() ?? null,
    lastDuration: state.lastDuration,
    lastResult: state.lastResult,
    runCount: state.runCount,
    errorCount: state.errorCount,
    lastError: state.lastError,
    enabled: state.enabled,
    schedule: state.schedule,
  };
}

export function getAllJobStates(): JobRunResult[] {
  const results: JobRunResult[] = [];
  for (const [jobName, state] of jobStates) {
    results.push({
      jobName,
      lastRunAt: state.lastRunAt?.toISOString() ?? null,
      nextRunAt: state.nextRunAt?.toISOString() ?? null,
      lastDuration: state.lastDuration,
      lastResult: state.lastResult,
      runCount: state.runCount,
      errorCount: state.errorCount,
      lastError: state.lastError,
      enabled: state.enabled,
      schedule: state.schedule,
    });
  }
  return results;
}

/** Server start time */
export const serverStartedAt = new Date();
