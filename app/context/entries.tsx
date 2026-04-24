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

export interface ConfirmedEntry {
  id: string;
  fileName: string;
  paymentDate: string | null;
  paymentDestination: string | null;
  amount: string | null;
}

interface EntriesContextType {
  entries: PDFEntry[];
  setEntries: React.Dispatch<React.SetStateAction<PDFEntry[]>>;
  confirmedMap: Record<string, ConfirmedEntry>;
  confirm: (entry: ConfirmedEntry) => void;
  unconfirm: (id: string) => void;
}

const EntriesContext = createContext<EntriesContextType | null>(null);

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<PDFEntry[]>([]);
  const [confirmedMap, setConfirmedMap] = useState<Record<string, ConfirmedEntry>>({});

  const confirm = (entry: ConfirmedEntry) =>
    setConfirmedMap((prev) => ({ ...prev, [entry.id]: entry }));

  const unconfirm = (id: string) =>
    setConfirmedMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  return (
    <EntriesContext.Provider value={{ entries, setEntries, confirmedMap, confirm, unconfirm }}>
      {children}
    </EntriesContext.Provider>
  );
}

export function useEntries() {
  const ctx = useContext(EntriesContext);
  if (!ctx) throw new Error("useEntries must be used within EntriesProvider");
  return ctx;
}
