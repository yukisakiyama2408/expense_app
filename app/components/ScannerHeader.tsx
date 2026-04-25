"use client";

import { useEntries } from "@/app/context/entries";

export function ScannerHeader() {
  const { selectedMonth } = useEntries();

  const title = selectedMonth
    ? `${selectedMonth.year}年${selectedMonth.month}月分 経費精算`
    : "領収書スキャナ";

  return (
    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
      {title}
    </h1>
  );
}
