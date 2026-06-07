"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { PaymentAccountDTO } from "@/lib/db/queries/ledger";
import { QuickTransactionSheet } from "@/components/ledger/quick-transaction-sheet";

interface LedgerContextValue {
  accounts: PaymentAccountDTO[];
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function useLedger() {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used within LedgerProvider");
  return ctx;
}

export function LedgerProvider({
  accounts,
  children,
}: {
  accounts: PaymentAccountDTO[];
  children: React.ReactNode;
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const openQuickAdd = useCallback(() => setQuickAddOpen(true), []);
  const closeQuickAdd = useCallback(() => setQuickAddOpen(false), []);

  return (
    <LedgerContext.Provider value={{ accounts, openQuickAdd, closeQuickAdd }}>
      {children}
      <QuickTransactionSheet
        accounts={accounts}
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
      />
    </LedgerContext.Provider>
  );
}
