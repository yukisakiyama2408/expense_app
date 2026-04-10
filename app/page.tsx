import { UploadForm } from "@/app/components/UploadForm";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <main className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            領収書スキャナ
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            PDF・画像をアップロードすると、支払日・支払い先・金額を自動抽出します
          </p>
        </div>
        <UploadForm />
      </main>
    </div>
  );
}
