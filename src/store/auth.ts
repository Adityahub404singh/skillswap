// src/store/auth.ts
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
  token: null, // Initial state null
  user: null,
  
  // Storage logic ab App.tsx aur Login.tsx handle kar rahe hain
  // Yahan sirf state update hogi
  setToken: (token) => set({ token }),
  
  setUser: (user) => set({ user }),
  
  updateCredits: (amount) => set((state) => ({ 
      user: state.user ? { ...state.user, credits: state.user.credits + amount } : null 
  })),
  
  logout: () => {
    // Logout ke time localStorage se token hatana zaroori hai
    localStorage.removeItem("skillswap_token");
    set({ token: null, user: null });
  },
}));