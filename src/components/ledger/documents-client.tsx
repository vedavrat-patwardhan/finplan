"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentUpload } from "@/components/ledger/document-upload";
import { SalarySlipForm } from "@/components/ledger/salary-slip-form";
import { BillForm } from "@/components/ledger/bill-form";
import { DocumentRow } from "@/components/ledger/document-row";
import { SavedPasswordManager } from "@/components/ledger/saved-password-manager";
import { StatementImport } from "@/components/ledger/statement-import";
import type { DocumentDTO, PaymentAccountDTO, SavedPasswordDTO } from "@/lib/db/queries/ledger";

export function DocumentsClient({
  documents,
  accounts,
  savedPasswords,
  categories,
}: {
  documents: DocumentDTO[];
  accounts: PaymentAccountDTO[];
  savedPasswords: SavedPasswordDTO[];
  categories: string[];
}) {
  const router = useRouter();
  const [pendingDoc, setPendingDoc] = useState<{
    id: string;
    type: string;
  } | null>(null);

  function refresh() {
    setPendingDoc(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <StatementImport
        accounts={accounts}
        savedPasswords={savedPasswords}
        categories={categories}
        onImported={refresh}
      />

      <DocumentUpload
        savedPasswords={savedPasswords}
        onUploaded={(id, type) => setPendingDoc({ id, type })}
      />

      {pendingDoc?.type === "salary_slip" ? (
        <SalarySlipForm documentId={pendingDoc.id} onSuccess={refresh} />
      ) : null}

      {pendingDoc &&
      (pendingDoc.type === "credit_card_bill" || pendingDoc.type === "utility_bill") ? (
        <BillForm
          documentId={pendingDoc.id}
          accounts={accounts}
          onSuccess={refresh}
        />
      ) : null}

      <section className="space-y-3 section-break">
        <h2 className="text-lg font-bold">Your uploads</h2>
        <p className="text-sm text-muted-foreground">
          Salary slips, bills, and receipts you&apos;ve added
        </p>
        {documents.length === 0 ? (
          <p className="border border-dashed border-border bg-muted px-5 py-8 text-center text-sm text-muted-foreground">
            No documents yet — upload a salary slip or bill above to get started.
          </p>
        ) : (
          documents.map((doc) => (
            <DocumentRow key={doc.id} document={doc} onDeleted={refresh} />
          ))
        )}
      </section>

      <SavedPasswordManager savedPasswords={savedPasswords} onChanged={refresh} />
    </div>
  );
}
