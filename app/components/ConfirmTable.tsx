"use client";

import { useEntries } from "@/app/context/entries";
import { useRouter } from "next/navigation";

export function ConfirmTable() {
  const { confirmedMap } = useEntries();
  const router = useRouter();

  const sorted = Object.values(confirmedMap).sort((a, b) => {
    if (!a.paymentDate && !b.paymentDate) return 0;
    if (!a.paymentDate) return 1;
    if (!b.paymentDate) return -1;
    return a.paymentDate.localeCompare(b.paymentDate);
  });

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-sm text-zinc-500">確定されたデータがありません</p>
        <button
          onClick={() => router.push("/results")}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          抽出結果ページへ
        </button>
      </div>
    );
  }

  const columns = [
    { key: "paymentDate" as const, label: "支払日" },
    { key: "paymentDestination" as const, label: "支払い先" },
    { key: "amount" as const, label: "金額" },
    { key: "fileName" as const, label: "ファイル名" },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[640px] border-collapse bg-white text-left dark:bg-zinc-900">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            {columns.map(({ key, label }) => (
              <th
                key={key}
                className="py-3 pl-4 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => (
            <tr key={entry.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
              {columns.map(({ key }) => (
                <td key={key} className="py-3 pl-4 pr-4 text-sm text-zinc-900 dark:text-zinc-50">
                  {entry[key] ?? <span className="text-zinc-400">不明</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
