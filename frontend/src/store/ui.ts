import { create } from "zustand";

export type ToastType = "info" | "success" | "error";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface UIState {
  toasts: Toast[];
  toast: (message: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
}

let counter = 0;

export const useUI = create<UIState>((set) => ({
  toasts: [],
  toast(message, type = "info") {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
