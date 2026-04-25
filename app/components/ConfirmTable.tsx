"use client";

import { useState } from "react";
import { useEntries } from "@/app/context/entries";
import { useRouter } from "next/navigation";

export function ConfirmTable() {
  const { confirmedMap } = useEntries();
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);

  const sorted = Object.values(confirmedMap).sort((a, b) => {
    if (!a.paymentDate && !b.paymentDate) return 0;
    if (!a.paymentDate) return 1;
    if (!b.paymentDate) return -1;
    return a.paymentDate.localeCompare(b.paymentDate);
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: sorted }),
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "経費精算申請書.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

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

  const staticColumns = [
    { key: "paymentDate" as const, label: "支払日" },
    { key: "paymentDestination" as const, label: "支払い先" },
    { key: "amount" as const, label: "金額" },
  ];

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[800px] border-collapse bg-white text-left dark:bg-zinc-900">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              {staticColumns.map(({ key, label }) => (
                <th
                  key={key}
                  className="py-3 pl-4 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                >
                  {label}
                </th>
              ))}
              <th className="py-3 pl-4 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                勘定項目
              </th>
              <th className="py-3 pl-4 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                目的・同席者・目的地 など
              </th>
              <th className="py-3 pl-4 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                ファイル名
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr key={entry.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                {staticColumns.map(({ key }) => (
                  <td key={key} className="py-3 pl-4 pr-4 text-sm text-zinc-900 dark:text-zinc-50">
                    {entry[key] ?? <span className="text-zinc-400">不明</span>}
                  </td>
                ))}
                <td className="py-3 pl-4 pr-4 text-sm text-zinc-900 dark:text-zinc-50">
                  {entry.accountItem}
                </td>
                <td className="py-3 pl-4 pr-4 text-sm text-zinc-900 dark:text-zinc-50">
                  {entry.purpose || <span className="text-zinc-400">—</span>}
                </td>
                <td className="py-3 pl-4 pr-4 text-sm text-zinc-900 dark:text-zinc-50">
                  {entry.fileName}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isExporting ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              出力中...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Excelを出力
            </>
          )}
        </button>
      </div>
    </div>
  );
}
