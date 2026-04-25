import { MonthSelector } from "@/app/components/MonthSelector";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <main className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            経費精算
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            精算する月を選択してください
          </p>
        </div>
        <MonthSelector />
      </main>
    </div>
  );
}
