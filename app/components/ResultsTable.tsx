"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEntries, type PDFEntry } from "@/app/context/entries";


type FieldKey = "paymentDate" | "paymentDestination" | "amount";

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: "paymentDate", label: "支払日" },
  { key: "paymentDestination", label: "支払い先" },
  { key: "amount", label: "金額" },
];

function CandidateCell({
  candidates,
  selected,
  onSelect,
}: {
  candidates: string[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  if (candidates.length === 0) return <span className="text-zinc-400">不明</span>;
  if (candidates.length === 1) return <span className="text-sm text-zinc-900 dark:text-zinc-50">{candidates[0]}</span>;
  return (
    <select
      value={selected ?? ""}
      onChange={(e) => onSelect(e.target.value)}
      className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
    >
      {candidates.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}

function EntryRow({ entry }: { entry: PDFEntry }) {
  const [selected, setSelected] = useState<Record<FieldKey, string | null>>({
    paymentDate: null,
    paymentDestination: null,
    amount: null,
  });
  const [confirmed, setConfirmed] = useState<Record<FieldKey, string | null> | null>(null);

  useEffect(() => {
    if (entry.candidates) {
      setSelected({
        paymentDate: entry.candidates.paymentDate[0] ?? null,
        paymentDestination: entry.candidates.paymentDestination[0] ?? null,
        amount: entry.candidates.amount[0] ?? null,
      });
      setConfirmed(null);
    }
  }, [entry.candidates]);

  const fileNameCell = (
    <td className="py-3 pl-4 pr-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
      {entry.fileName}
    </td>
  );

  if (entry.status === "processing") {
    return (
      <tr className="border-b border-zinc-100 dark:border-zinc-800">
        {fileNameCell}
        <td colSpan={FIELDS.length + 1} className="py-3 text-sm text-zinc-400">
          <span className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            解析中...
          </span>
        </td>
      </tr>
    );
  }

  if (entry.status === "error") {
    return (
      <tr className="border-b border-zinc-100 dark:border-zinc-800">
        {fileNameCell}
        <td colSpan={FIELDS.length + 1} className="py-3 text-sm text-red-600 dark:text-red-400">
          {entry.error ?? "エラーが発生しました"}
        </td>
      </tr>
    );
  }

  if (confirmed) {
    return (
      <tr className="border-b border-zinc-100 dark:border-zinc-800">
        {fileNameCell}
        {FIELDS.map(({ key }) => (
          <td key={key} className="py-3 pr-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {confirmed[key] ?? <span className="font-normal text-zinc-400">不明</span>}
          </td>
        ))}
        <td className="py-3 pl-4 pr-4 text-right">
          <button
            onClick={() => setConfirmed(null)}
            className="whitespace-nowrap text-xs text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            変更する
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      {fileNameCell}
      {FIELDS.map(({ key }) => (
        <td key={key} className="py-2 pr-4">
          <CandidateCell
            candidates={entry.candidates?.[key] ?? []}
            selected={selected[key]}
            onSelect={(value) => setSelected((prev) => ({ ...prev, [key]: value }))}
          />
        </td>
      ))}
      <td className="py-2 pl-4 pr-4 text-right">
        <button
          onClick={() => setConfirmed(selected)}
          className="whitespace-nowrap rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          決定
        </button>
      </td>
    </tr>
  );
}

export function ResultsTable() {
  const { entries } = useEntries();
  const router = useRouter();

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-sm text-zinc-500">アップロードされたファイルがありません</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          アップロードページへ
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[720px] border-collapse bg-white text-left dark:bg-zinc-900">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="w-[20%] py-3 pl-4 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              ファイル名
            </th>
            {FIELDS.map(({ key, label }) => (
              <th
                key={key}
                className="w-[25%] py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                {label}
              </th>
            ))}
            <th className="w-[5%] py-3 pr-4" />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
