import { useUI } from "../store/ui";

const toastStyles: Record<string, string> = {
  success: "bg-green-600",
  error: "bg-rose-600",
  info: "bg-slate-800",
};

export function Toaster() {
  const { toasts, dismiss } = useUI();
  return (
    <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm text-white shadow-lg ${
            toastStyles[t.type]
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
