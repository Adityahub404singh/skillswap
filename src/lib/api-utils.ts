// src/lib/api-utils.ts
import { useAuthStore } from "@/store/auth";
import { Capacitor } from "@capacitor/core";

// ✅ Mobile pe sahi URL
const PRODUCTION_API = "https://skillswap-b59w.onrender.com";

export const API_BASE_URL = (() => {
  if (Capacitor.isNativePlatform()) {
    return PRODUCTION_API;
  }
  return import.meta.env.VITE_API_URL || "";
})();

// ✅ 401 handler
async function handleResponse(response: Response): Promise<Response> {
  if (response.status === 401) {
    console.warn("[API] 401 — Token invalid/expired. Logging out.");
    const store = useAuthStore.getState();
    // logout ya setToken — jo bhi available ho
    if (typeof (store as any).logout === "function") {
      (store as any).logout();
    } else if (typeof (store as any).setToken === "function") {
      (store as any).setToken(null);
    }
    setTimeout(() => { window.location.href = "/login"; }, 100);
  }
  return response;
}

// ✅ Wrapper fetch
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = useAuthStore.getState().token;
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  return handleResponse(res);
}

// ✅ React hook
export function useApiOptions() {
  const token = useAuthStore((s) => s.token);
  return {
    request: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  };
}

// ✅ Non-hook version
export function buildApiOptions(token: string | null) {
  return {
    request: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  };
}