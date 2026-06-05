import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url: string = error.config?.url || "";
    const onAuthRoute = url.includes("/auth/login") || url.includes("/auth/register");
    if (error.response?.status === 401 && !onAuthRoute) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export function apiError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    return e.response?.data?.error?.message || e.message;
  }
  return "Something went wrong";
}
