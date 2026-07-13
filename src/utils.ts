import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { clearToken, getToken } from "./auth";
import { getPortal, getPortalLoginUrl } from "./portal";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const fetcher = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  if (options?.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = getPortalLoginUrl(getPortal());
    }
    throw new ApiError('Unauthorized', 401);
  }

  if (!res.ok) {
    let message = 'API Error';
    try {
      const body = await res.json();
      message = body.error || body.message || message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status);
  }

  return res.json();
};

export async function downloadAuthenticated(url: string, filename?: string) {
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = getPortalLoginUrl(getPortal());
    throw new ApiError('Unauthorized', 401);
  }
  if (!res.ok) {
    let message = 'Download failed';
    try {
      const body = await res.json();
      message = body.error || message;
    } catch { /* ignore */ }
    throw new ApiError(message, res.status);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  if (filename) anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}