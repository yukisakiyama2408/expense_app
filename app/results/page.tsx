import Link from "next/link";
import { ResultsTable } from "@/app/components/ResultsTable";

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              抽出結果
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              各項目を確認・選択して決定してください
            </p>
          </div>
          <Link
            href="/scanner"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← 戻る
          </Link>
        </div>
        <ResultsTable />
      </div>
    </div>
  );
}
