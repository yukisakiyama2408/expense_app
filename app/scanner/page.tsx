import Link from "next/link";
import { UploadForm } from "@/app/components/UploadForm";
import { ScannerHeader } from "@/app/components/ScannerHeader";

export default function ScannerPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <main className="w-full max-w-md">
        <div className="mb-8">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            月選択に戻る
          </Link>
          <div className="mt-2 text-center">
            <ScannerHeader />
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              PDFをアップロードして、支払日・支払い先・金額を自動抽出します
            </p>
          </div>
        </div>
        <UploadForm />
      </main>
    </div>
  );
}
