"use client";

import { useState, useEffect } from "react";
import { extractExpenseFromPDF, ExtractedExpenseCandidates } from "@/app/actions";

type FieldKey = "paymentDate" | "paymentDestination" | "amount";

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: "paymentDate", label: "支払日" },
  { key: "paymentDestination", label: "支払い先" },
  { key: "amount", label: "金額" },
];

interface PDFEntry {
  id: string;
  fileName: string;
  status: "processing" | "done" | "error";
  candidates?: ExtractedExpenseCandidates;
  error?: string;
}

function CandidateCell({
  candidates,
  selected,
  onSelect,
}: {
  candidates: string[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  if (candidates.length === 0) {
    return <span className="text-zinc-400">不明</span>;
  }
  if (candidates.length === 1) {
    return <span className="text-sm text-zinc-900 dark:text-zinc-50">{candidates[0]}</span>;
  }
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
            className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
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

export function UploadForm() {
  const [entries, setEntries] = useState<PDFEntry[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || isUploading) return;

    const files = selectedFiles;
    setSelectedFiles([]);
    setInputKey((k) => k + 1);
    setIsUploading(true);

    const newEntries: PDFEntry[] = files.map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      status: "processing",
    }));

    setEntries((prev) => [...prev, ...newEntries]);

    await Promise.all(
      files.map(async (file, i) => {
        const id = newEntries[i].id;
        const formData = new FormData();
        formData.append("pdf", file);
        try {
          const result = await extractExpenseFromPDF(null, formData);
          setEntries((prev) =>
            prev.map((e) =>
              e.id === id
                ? {
                    ...e,
                    status: result.success ? "done" : "error",
                    candidates: result.candidates,
                    error: result.error,
                  }
                : e
            )
          );
        } catch {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === id ? { ...e, status: "error", error: "エラーが発生しました" } : e
            )
          );
        }
      })
    );

    setIsUploading(false);
  };

  const fileLabelText =
    selectedFiles.length === 0
      ? null
      : selectedFiles.length === 1
      ? selectedFiles[0].name
      : `${selectedFiles.length}枚のPDFを選択中`;

  return (
    <div className="w-full space-y-6">
      {/* アップロードエリア */}
      <div className="space-y-3">
        <label
          htmlFor="pdf-input"
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            fileLabelText
              ? "border-zinc-900 bg-zinc-100 dark:border-zinc-400 dark:bg-zinc-800"
              : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
          }`}
        >
          <svg
            className={`h-10 w-10 ${fileLabelText ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <div>
            {fileLabelText ? (
              <>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{fileLabelText}</p>
                <p className="mt-1 text-xs text-zinc-500">クリックしてファイルを変更</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  クリックしてPDFを選択
                </p>
                <p className="mt-1 text-xs text-zinc-500">複数選択可</p>
              </>
            )}
          </div>
          <input
            key={inputKey}
            id="pdf-input"
            type="file"
            multiple
            accept=".pdf,application/pdf"
            className="sr-only"
            onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
          />
        </label>

        <button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || isUploading}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              解析中...
            </span>
          ) : selectedFiles.length > 0 ? (
            `${selectedFiles.length}枚のPDFを解析する`
          ) : (
            "アップロード・解析"
          )}
        </button>
      </div>

      {/* テーブル */}
      {entries.length > 0 && (
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
      )}
    </div>
  );
}
