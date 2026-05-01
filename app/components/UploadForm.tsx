"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { extractExpenseFromPDF } from "@/app/actions";
import { useEntries, type PDFEntry } from "@/app/context/entries";

export function UploadForm() {
  const router = useRouter();
  const { setEntries } = useEntries();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [addInputKey, setAddInputKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

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

    setEntries(newEntries);
    router.push("/results");

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

  const handleAddFiles = (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const unique = newFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...unique];
    });
    setAddInputKey((k) => k + 1);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const hasFiles = selectedFiles.length > 0;

  return (
    <div className="w-full space-y-3">
      <label
        htmlFor="pdf-input"
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          hasFiles
            ? "border-zinc-900 bg-zinc-100 dark:border-zinc-400 dark:bg-zinc-800"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
        }`}
      >
        <svg
          className={`h-10 w-10 ${hasFiles ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"}`}
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
          {hasFiles ? (
            <>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {selectedFiles.length}枚のPDFを選択中
              </p>
              <p className="mt-1 text-xs text-zinc-500">クリックしてファイルを選択し直す</p>
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

      {hasFiles && (
        <ul className="space-y-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
          {selectedFiles.map((file, i) => (
            <li key={file.name} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-zinc-700 dark:text-zinc-300">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="shrink-0 text-xs text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasFiles && (
        <div>
          <input
            key={addInputKey}
            ref={addInputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
            className="sr-only"
            onChange={(e) => handleAddFiles(Array.from(e.target.files ?? []))}
          />
          <button
            type="button"
            onClick={() => addInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            PDFを追加
          </button>
        </div>
      )}

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
  );
}
