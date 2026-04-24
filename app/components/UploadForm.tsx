"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { extractExpenseFromPDF, ActionState, ExtractedExpenseCandidates } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          解析中...
        </span>
      ) : (
        "アップロード・解析"
      )}
    </button>
  );
}

type FieldKey = "paymentDate" | "paymentDestination" | "amount";

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: "paymentDate", label: "支払日" },
  { key: "paymentDestination", label: "支払い先" },
  { key: "amount", label: "金額" },
];

function CandidateField({
  label,
  candidates,
  selected,
  onSelect,
}: {
  label: string;
  candidates: string[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0 dark:border-zinc-800">
      <dt className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd>
        {candidates.length === 0 ? (
          <span className="text-sm text-zinc-400">不明</span>
        ) : candidates.length === 1 ? (
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{candidates[0]}</span>
        ) : (
          <div className="space-y-1">
            {candidates.map((candidate) => (
              <label
                key={candidate}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <input
                  type="radio"
                  name={label}
                  value={candidate}
                  checked={selected === candidate}
                  onChange={() => onSelect(candidate)}
                  className="accent-zinc-900 dark:accent-zinc-50"
                />
                <span className="text-sm text-zinc-900 dark:text-zinc-50">{candidate}</span>
              </label>
            ))}
          </div>
        )}
      </dd>
    </div>
  );
}

function ConfirmedCard({
  confirmed,
  onEdit,
}: {
  confirmed: Record<FieldKey, string | null>;
  onEdit: () => void;
}) {
  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">確定データ</h2>
        <button
          onClick={onEdit}
          className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          変更する
        </button>
      </div>
      <dl className="space-y-3">
        {FIELDS.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0 last:pb-0 dark:border-zinc-800"
          >
            <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {confirmed[key] ?? <span className="font-normal text-zinc-400">不明</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CandidateSelector({ candidates }: { candidates: ExtractedExpenseCandidates }) {
  const [selected, setSelected] = useState<Record<FieldKey, string | null>>({
    paymentDate: candidates.paymentDate[0] ?? null,
    paymentDestination: candidates.paymentDestination[0] ?? null,
    amount: candidates.amount[0] ?? null,
  });
  const [confirmed, setConfirmed] = useState<Record<FieldKey, string | null> | null>(null);

  useEffect(() => {
    setSelected({
      paymentDate: candidates.paymentDate[0] ?? null,
      paymentDestination: candidates.paymentDestination[0] ?? null,
      amount: candidates.amount[0] ?? null,
    });
    setConfirmed(null);
  }, [candidates]);

  if (confirmed) {
    return <ConfirmedCard confirmed={confirmed} onEdit={() => setConfirmed(null)} />;
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">抽出結果</h2>
      <dl className="space-y-4">
        {FIELDS.map(({ key, label }) => (
          <CandidateField
            key={key}
            label={label}
            candidates={candidates[key]}
            selected={selected[key]}
            onSelect={(value) => setSelected((prev) => ({ ...prev, [key]: value }))}
          />
        ))}
      </dl>
      <button
        onClick={() => setConfirmed(selected)}
        className="mt-6 flex h-10 w-full items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        決定
      </button>
    </div>
  );
}

export function UploadForm() {
  const [state, action] = useActionState<ActionState | null, FormData>(
    extractExpenseFromPDF,
    null
  );
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <div className="w-full">
      <form action={action} className="space-y-4">
        <label
          htmlFor="pdf-input"
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            selectedFile
              ? "border-zinc-900 bg-zinc-100 dark:border-zinc-400 dark:bg-zinc-800"
              : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
          }`}
        >
          <svg
            className={`h-10 w-10 ${selectedFile ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"}`}
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
            {selectedFile ? (
              <>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{selectedFile}</p>
                <p className="mt-1 text-xs text-zinc-500">クリックしてファイルを変更</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">クリックしてファイルを選択</p>
                <p className="mt-1 text-xs text-zinc-500">PDF 対応</p>
              </>
            )}
          </div>
          <input
            id="pdf-input"
            type="file"
            name="pdf"
            accept=".pdf,application/pdf"
            required
            className="sr-only"
            onChange={(e) => setSelectedFile(e.target.files?.[0]?.name ?? null)}
          />
        </label>

        <SubmitButton />
      </form>

      {state?.error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {state.error}
        </div>
      )}

      {state?.success && state.candidates && (
        <CandidateSelector candidates={state.candidates} />
      )}

      {state?.success && state.rawText && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            rawText（デバッグ用）
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-zinc-100 p-3 text-xs whitespace-pre-wrap text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {state.rawText}
          </pre>
        </details>
      )}
    </div>
  );
}
