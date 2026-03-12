import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type ApiError = { response?: { data?: { error?: string } }; message?: string };

function isApiError(err: unknown): err is ApiError {
  return typeof err === "object" && err !== null;
}

export function getApiErrorMessage(err: unknown, fallback = "Operation failed"): string {
  if (isApiError(err)) {
    return err.response?.data?.error || err.message || fallback;
  }
  return fallback;
}
