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
  accountItem: string;
  purpose: string;
}

export interface SelectedMonth {
  year: number;
  month: number;
}

interface EntriesContextType {
  entries: PDFEntry[];
  setEntries: React.Dispatch<React.SetStateAction<PDFEntry[]>>;
  confirmedMap: Record<string, ConfirmedEntry>;
  confirm: (entry: ConfirmedEntry) => void;
  unconfirm: (id: string) => void;
  selectedMonth: SelectedMonth | null;
  setSelectedMonth: (month: SelectedMonth | null) => void;
  userName: string;
  setUserName: (name: string) => void;
}

const EntriesContext = createContext<EntriesContextType | null>(null);

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<PDFEntry[]>([]);
  const [confirmedMap, setConfirmedMap] = useState<Record<string, ConfirmedEntry>>({});
  const [selectedMonth, setSelectedMonth] = useState<SelectedMonth | null>(null);
  const [userName, setUserName] = useState<string>("");

  const confirm = (entry: ConfirmedEntry) =>
    setConfirmedMap((prev) => ({ ...prev, [entry.id]: entry }));

  const unconfirm = (id: string) =>
    setConfirmedMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  return (
    <EntriesContext.Provider value={{ entries, setEntries, confirmedMap, confirm, unconfirm, selectedMonth, setSelectedMonth, userName, setUserName }}>
      {children}
    </EntriesContext.Provider>
  );
}

export function useEntries() {
  const ctx = useContext(EntriesContext);
  if (!ctx) throw new Error("useEntries must be used within EntriesProvider");
  return ctx;
}
