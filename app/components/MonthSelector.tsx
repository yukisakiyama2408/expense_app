"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEntries } from "@/app/context/entries";

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

export function MonthSelector() {
  const router = useRouter();
  const { setSelectedMonth } = useEntries();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const handleSelect = (month: number) => {
    setSelectedMonth({ year, month });
    router.push("/scanner");
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          aria-label="前年"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="w-20 text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {year}年
        </span>
        <button
          onClick={() => setYear((y) => y + 1)}
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          aria-label="翌年"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MONTHS.map((label, i) => {
          const month = i + 1;
          const isCurrent = year === currentYear && month === currentMonth;
          return (
            <button
              key={month}
              onClick={() => handleSelect(month)}
              className={`rounded-xl py-4 text-sm font-medium transition-colors ${
                isCurrent
                  ? "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
