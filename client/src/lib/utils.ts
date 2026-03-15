import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type AxiosLikeError = {
  response?: { data?: { error?: string; message?: string } };
  message?: string;
};

export function getApiError(err: unknown, fallback: string): string {
  const e = err as AxiosLikeError;
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;
}
