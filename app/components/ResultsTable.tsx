"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { extractExpenseFromPDF } from "@/app/actions";
import { useEntries, type PDFEntry, type ConfirmedEntry } from "@/app/context/entries";

type FieldKey = "paymentDate" | "paymentDestination" | "amount";

const FIELDS: { key: FieldKey; label: string; inputType?: "text" | "date" }[] = [
  { key: "paymentDate", label: "支払日", inputType: "date" },
  { key: "paymentDestination", label: "支払い先" },
  { key: "amount", label: "金額" },
];

const ACCOUNT_ITEMS = [
  "飛行機",
  "宿泊",
  "食事代",
  "電車・バス",
  "タクシー",
  "駐車場・高速料金",
  "会議費",
  "交際費",
  "消耗品費",
  "新聞図書費",
  "通信費",
  "その他",
] as const;

function DateInput({
  value,
  onSelect,
  placeholder,
}: {
  value: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const showPicker = focused || !value;

  return (
    <input
      ref={inputRef}
      type={showPicker ? "date" : "text"}
      value={value ?? ""}
      onChange={(e) => onSelect(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-400"
    />
  );
}

function CandidateCell({
  candidates,
  selected,
  onSelect,
  placeholder,
  inputType = "text",
}: {
  candidates: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
  inputType?: "text" | "date";
}) {
  if (candidates.length === 0) {
    if (inputType === "date") {
      return <DateInput value={selected} onSelect={onSelect} placeholder={placeholder} />;
    }
    return (
      <input
        type="text"
        value={selected ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-400"
      />
    );
  }
  if (candidates.length === 1) return <span className="text-sm text-zinc-900 dark:text-zinc-50">{candidates[0]}</span>;
  return (
    <select
      value={selected ?? ""}
      onChange={(e) => onSelect(e.target.value)}
      className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
    >
      {candidates.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ml-3 whitespace-nowrap text-xs text-zinc-400 underline-offset-2 hover:text-red-500 hover:underline dark:text-zinc-500 dark:hover:text-red-400"
    >
      削除する
    </button>
  );
}

function EntryRow({
  entry,
  confirmed,
  onConfirm,
  onUnconfirm,
  onDelete,
}: {
  entry: PDFEntry;
  confirmed: ConfirmedEntry | undefined;
  onConfirm: (data: ConfirmedEntry) => void;
  onUnconfirm: () => void;
  onDelete: () => void;
}) {
  const [selected, setSelected] = useState<Record<FieldKey, string | null>>({
    paymentDate: null,
    paymentDestination: null,
    amount: null,
  });
  const [accountItem, setAccountItem] = useState<string>("その他");
  const [purpose, setPurpose] = useState<string>("");

  useEffect(() => {
    if (entry.candidates) {
      setSelected({
        paymentDate: entry.candidates.paymentDate[0] ?? null,
        paymentDestination: entry.candidates.paymentDestination[0] ?? null,
        amount: entry.candidates.amount[0] ?? null,
      });
    }
  }, [entry.candidates]);

  if (entry.status === "processing") {
    return (
      <tr className="border-b border-zinc-100 dark:border-zinc-800">
        <td colSpan={FIELDS.length + 2} className="py-3 pl-4 text-sm text-zinc-400">
          <span className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            解析中...
          </span>
        </td>
        <td className="py-3 pl-4 pr-4 text-right">
          <DeleteButton onClick={onDelete} />
        </td>
      </tr>
    );
  }

  if (entry.status === "error") {
    return (
      <tr className="border-b border-zinc-100 dark:border-zinc-800">
        <td colSpan={FIELDS.length + 2} className="py-3 pl-4 text-sm text-red-600 dark:text-red-400">
          {entry.error ?? "エラーが発生しました"}
        </td>
        <td className="py-3 pl-4 pr-4 text-right">
          <DeleteButton onClick={onDelete} />
        </td>
      </tr>
    );
  }

  if (confirmed) {
    return (
      <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40">
        {FIELDS.map(({ key }) => (
          <td key={key} className="truncate py-3 pr-4 text-sm font-medium text-zinc-900 first:pl-4 dark:text-zinc-50">
            {confirmed[key] ?? <span className="font-normal text-zinc-400">不明</span>}
          </td>
        ))}
        <td className="truncate py-3 pr-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {confirmed.accountItem}
        </td>
        <td className="truncate py-3 pr-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {confirmed.purpose || <span className="font-normal text-zinc-400">—</span>}
        </td>
        <td className="py-3 pr-4">
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={onUnconfirm}
              className="whitespace-nowrap text-xs text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              変更する
            </button>
            <DeleteButton onClick={onDelete} />
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      {FIELDS.map(({ key, label, inputType }) => (
        <td key={key} className="py-2 pr-4 first:pl-4">
          <CandidateCell
            candidates={entry.candidates?.[key] ?? []}
            selected={selected[key]}
            onSelect={(value) => setSelected((prev) => ({ ...prev, [key]: value }))}
            placeholder={label}
            inputType={inputType}
          />
        </td>
      ))}
      <td className="py-2 pr-4">
        <select
          value={accountItem}
          onChange={(e) => setAccountItem(e.target.value)}
          className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        >
          {ACCOUNT_ITEMS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-4">
        <input
          type="text"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="目的・同席者・目的地 など"
          className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-400"
        />
      </td>
      <td className="py-2 pr-4">
        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={() =>
              onConfirm({
                id: entry.id,
                fileName: entry.fileName,
                paymentDate: selected.paymentDate,
                paymentDestination: selected.paymentDestination,
                amount: selected.amount,
                accountItem,
                purpose,
              })
            }
            className="whitespace-nowrap rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            決定
          </button>
          <DeleteButton onClick={onDelete} />
        </div>
      </td>
    </tr>
  );
}

export function ResultsTable() {
  const { entries, setEntries, confirmedMap, confirm, unconfirm } = useEntries();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [inputKey, setInputKey] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  const confirmedCount = Object.keys(confirmedMap).length;
  const hasConfirmed = confirmedCount > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleAddManual = () => {
    setShowMenu(false);
    setEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        fileName: "",
        status: "done",
        candidates: { paymentDate: [], paymentDestination: [], amount: [] },
      },
    ]);
  };

  const handleAddFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setInputKey((k) => k + 1);

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
  };

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
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[960px] table-fixed border-collapse bg-white text-left dark:bg-zinc-900">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="w-[14%] py-3 pl-4 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                支払日
              </th>
              <th className="w-[18%] py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                支払い先
              </th>
              <th className="w-[12%] py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                金額
              </th>
              <th className="w-[16%] py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                勘定項目
              </th>
              <th className="w-[29%] py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                目的・同席者・目的地 など
              </th>
              <th className="w-[11%] py-3 pr-4" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                confirmed={confirmedMap[entry.id]}
                onConfirm={confirm}
                onUnconfirm={() => unconfirm(entry.id)}
                onDelete={() => {
                  setEntries((prev) => prev.filter((e) => e.id !== entry.id));
                  unconfirm(entry.id);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative" ref={menuRef}>
          <input
            key={inputKey}
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
            className="sr-only"
            onChange={(e) => {
              setShowMenu(false);
              handleAddFiles(Array.from(e.target.files ?? []));
            }}
          />
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            領収書を追加
          </button>
          {showMenu && (
            <div className="absolute left-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-md dark:border-zinc-700 dark:bg-zinc-900">
              <button
                onClick={handleAddManual}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                手入力で追加
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                PDFをアップロード
              </button>
            </div>
          )}
        </div>

        {hasConfirmed && (
          <button
            onClick={() => router.push("/confirm")}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            確定
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
