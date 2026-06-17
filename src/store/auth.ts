import { create } from "zustand";

export interface User {
  id: number;
  name: string;
  email: string;
  bio: string | null;
  avatar: string | null;
  credits: number;
  trustScore: number;
  sessionsCompleted: number;
  averageRating: number;
  isPremium: boolean;
  skillsTeach: string[];
  skillsLearn: string[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  updateCredits: (amount: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("skillswap_token"),
  user: null,
  setToken: (token) => {
    if (token) localStorage.setItem("skillswap_token", token);
    else localStorage.removeItem("skillswap_token");
    set({ token });
  },
  setUser: (user) => set({ user }),
  updateCredits: (amount) => set((state) => ({ 
      user: state.user ? { ...state.user, credits: state.user.credits + amount } : null 
  })),
  logout: () => {
    localStorage.removeItem("skillswap_token");
    set({ token: null, user: null });
  },
}));
