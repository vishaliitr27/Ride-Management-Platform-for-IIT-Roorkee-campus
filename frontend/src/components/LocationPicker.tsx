import { useEffect, useMemo, useRef, useState } from "react";
import { CAMPUS_LOCATIONS, CampusSpot } from "../lib/constants";
import { Icon } from "./Icon";

interface Props {
  label: string;
  value: CampusSpot | null;
  onChange: (spot: CampusSpot) => void;
  excludeName?: string;
  placeholder?: string;
}

export function LocationPicker({
  label,
  value,
  onChange,
  excludeName,
  placeholder = "Search a stop…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CAMPUS_LOCATIONS.filter((s) => {
      if (s.name === excludeName) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      );
    });
  }, [query, excludeName]);

  // Group the flat results by category, preserving order.
  const groups = useMemo(() => {
    const map = new Map<string, CampusSpot[]>();
    for (const s of results) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return [...map.entries()];
  }, [results]);

  useEffect(() => setActive(0), [query, open]);

  function select(spot: CampusSpot) {
    onChange(spot);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && results[active]) {
        e.preventDefault();
        select(results[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // The input shows the live query while typing/searching, otherwise the picked spot.
  const inputValue = open ? query : value?.name ?? "";
  let flatIndex = -1;

  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div ref={boxRef} className="relative">
        <input
          value={inputValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={value ? value.name : placeholder}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-8 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-slate-400">
          <Icon name="expand" size={16} />
        </span>

        {open && (
          <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {results.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">No stops found</p>
            ) : (
              groups.map(([category, spots]) => (
                <div key={category}>
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {category}
                  </p>
                  {spots.map((s) => {
                    flatIndex += 1;
                    const idx = flatIndex;
                    const isActive = idx === active;
                    const isSelected = s.name === value?.name;
                    return (
                      <button
                        type="button"
                        key={s.name}
                        // Use mousedown so selection fires before the input blur.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          select(s);
                        }}
                        onMouseEnter={() => setActive(idx)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                          isActive ? "bg-brand-50 text-brand-700" : "text-slate-700"
                        }`}
                      >
                        <span>{s.name}</span>
                        {isSelected && (
                          <span className="text-xs text-brand-600">Selected</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </label>
  );
}
