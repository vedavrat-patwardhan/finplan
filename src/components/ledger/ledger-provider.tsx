"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { LedgerTransactionDTO, PaymentAccountDTO } from "@/lib/db/queries/ledger";
import { QuickTransactionSheet } from "@/components/ledger/quick-transaction-sheet";

interface LedgerContextValue {
  accounts: PaymentAccountDTO[];
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
  openEditTransaction: (transaction: LedgerTransactionDTO) => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function useLedger() {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used within LedgerProvider");
  return ctx;
}

export function LedgerProvider({
  accounts,
  categories,
  children,
}: {
  accounts: PaymentAccountDTO[];
  categories: string[];
  children: React.ReactNode;
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<LedgerTransactionDTO | null>(null);

  const openQuickAdd = useCallback(() => {
    setEditTransaction(null);
    setQuickAddOpen(true);
  }, []);

  const closeQuickAdd = useCallback(() => {
    setQuickAddOpen(false);
    setEditTransaction(null);
  }, []);

  const openEditTransaction = useCallback((transaction: LedgerTransactionDTO) => {
    setQuickAddOpen(false);
    setEditTransaction(transaction);
  }, []);

  const sheetOpen = quickAddOpen || editTransaction !== null;

  return (
    <LedgerContext.Provider
      value={{ accounts, openQuickAdd, closeQuickAdd, openEditTransaction }}
    >
      {children}
      <QuickTransactionSheet
        key={sheetOpen ? editTransaction?.id ?? "new-transaction" : "closed"}
        accounts={accounts}
        categories={categories}
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) closeQuickAdd();
        }}
        transaction={editTransaction}
      />
    </LedgerContext.Provider>
  );
}
