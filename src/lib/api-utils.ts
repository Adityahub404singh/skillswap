// src/lib/api-utils.ts
import { useAuthStore } from "@/store/auth";

// Note: Agar mobile app mein ye empty aa raha hai, 
// toh ise direct URL se replace karna padega (jaise humne discuss kiya tha)
export const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function useApiOptions() {
  const token = useAuthStore((s) => s.token);

  return {
    request: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  };
}

export function buildApiOptions(token: string | null) {
  return {
    request: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  };
}