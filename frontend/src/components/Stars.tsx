export function Stars({
  value,
  onChange,
  size = "text-xl",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: string;
}) {
  return (
    <div className={`flex gap-0.5 ${size}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={`${onChange ? "cursor-pointer" : "cursor-default"} ${
            n <= value ? "text-amber-400" : "text-slate-300"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
