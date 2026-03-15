import { create } from "zustand";

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("skillswap_token"),
  setToken: (token) => {
    if (token) {
      localStorage.setItem("skillswap_token", token);
    } else {
      localStorage.removeItem("skillswap_token");
    }
    set({ token });
  },
  logout: () => {
    localStorage.removeItem("skillswap_token");
    set({ token: null });
  },
}));
