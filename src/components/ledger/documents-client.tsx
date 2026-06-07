"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentUpload } from "@/components/ledger/document-upload";
import { SalarySlipForm } from "@/components/ledger/salary-slip-form";
import { BillForm } from "@/components/ledger/bill-form";
import { DocumentRow } from "@/components/ledger/document-row";
import type { DocumentDTO, PaymentAccountDTO } from "@/lib/db/queries/ledger";

export function DocumentsClient({
  documents,
  accounts,
}: {
  documents: DocumentDTO[];
  accounts: PaymentAccountDTO[];
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
      <DocumentUpload
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

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Uploaded documents</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          documents.map((doc) => (
            <DocumentRow key={doc.id} document={doc} onDeleted={refresh} />
          ))
        )}
      </section>
    </div>
  );
}
