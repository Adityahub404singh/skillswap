import { create } from "zustand";

interface User {
  name: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("skillswap_token"),
  user: null,
  setToken: (token) => {
    if (token) {
      localStorage.setItem("skillswap_token", token);
    } else {
      localStorage.removeItem("skillswap_token");
    }
    set({ token });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem("skillswap_token");
    set({ token: null, user: null });
  },
}));

