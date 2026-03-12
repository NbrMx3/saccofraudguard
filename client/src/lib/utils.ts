import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type ApiError = { response?: { data?: { error?: string } }; message?: string };

export function getApiErrorMessage(err: unknown, fallback = "Operation failed"): string {
  const e = err as ApiError;
  return e?.response?.data?.error || e?.message || fallback;
}
