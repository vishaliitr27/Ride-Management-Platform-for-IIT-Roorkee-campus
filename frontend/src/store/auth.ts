import { create } from "zustand";
import { api } from "../lib/api";
import { resetSocket } from "../lib/socket";
import { User } from "../lib/types";

interface AuthState {
  token: string | null;
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: Record<string, unknown>) => Promise<User>;
  logout: () => void;
  loadMe: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: localStorage.getItem("token"),
  user: null,
  ready: false,

  async login(email, password) {
    const { data } = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    resetSocket();
    set({ token: data.token, user: data.user, ready: true });
    return data.user as User;
  },

  async register(payload) {
    const { data } = await api.post("/api/auth/register", payload);
    localStorage.setItem("token", data.token);
    resetSocket();
    set({ token: data.token, user: data.user, ready: true });
    return data.user as User;
  },

  logout() {
    localStorage.removeItem("token");
    resetSocket();
    set({ token: null, user: null, ready: true });
  },

  async loadMe() {
    if (!get().token) {
      set({ ready: true });
      return;
    }
    try {
      const { data } = await api.get("/api/auth/me");
      set({ user: data.user, ready: true });
    } catch {
      localStorage.removeItem("token");
      set({ token: null, user: null, ready: true });
    }
  },
}));
