"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEntries } from "@/app/context/entries";

function buildOptions(): { year: number; month: number; label: string }[] {
  const today = new Date();
  const options: { year: number; month: number; label: string }[] = [];
  // 24 months back to 1 month ahead
  for (let offset = 24; offset >= -1; offset--) {
    const d = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    options.push({ year: y, month: m, label: `${y}年${m}月` });
  }
  return options;
}

function defaultValue(options: { year: number; month: number; label: string }[]): string {
  const today = new Date();
  const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const found = options.find((o) => o.year === y && o.month === m);
  return found ? found.label : options[options.length - 2]?.label ?? options[0].label;
}

export function MonthSelector() {
  const router = useRouter();
  const { setSelectedMonth } = useEntries();
  const options = buildOptions();
  const [selected, setSelected] = useState(defaultValue(options));

  const handleSubmit = () => {
    const option = options.find((o) => o.label === selected);
    if (!option) return;
    setSelectedMonth({ year: option.year, month: option.month });
    router.push("/scanner");
  };

  return (
    <div className="w-full space-y-4">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-400"
      >
        {options.map((o) => (
          <option key={o.label} value={o.label}>
            {o.label}
          </option>
        ))}
      </select>

      <button
        onClick={handleSubmit}
        className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        次へ
      </button>
    </div>
  );
}
