"use client";

import { createContext, useContext, useState } from "react";
import type { ExtractedExpenseCandidates } from "@/app/actions";

export interface PDFEntry {
  id: string;
  fileName: string;
  status: "processing" | "done" | "error";
  candidates?: ExtractedExpenseCandidates;
  error?: string;
}

interface EntriesContextType {
  entries: PDFEntry[];
  setEntries: React.Dispatch<React.SetStateAction<PDFEntry[]>>;
}

const EntriesContext = createContext<EntriesContextType | null>(null);

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<PDFEntry[]>([]);
  return (
    <EntriesContext.Provider value={{ entries, setEntries }}>
      {children}
    </EntriesContext.Provider>
  );
}

export function useEntries() {
  const ctx = useContext(EntriesContext);
  if (!ctx) throw new Error("useEntries must be used within EntriesProvider");
  return ctx;
}
