"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteDocumentAction,
  getDocumentDownloadUrlAction,
} from "@/actions/ledger";
import { formatINR } from "@/lib/format";
import type { DocumentDTO } from "@/lib/db/queries/ledger";
import { FileText, Download, Trash2 } from "lucide-react";

const typeLabels: Record<string, string> = {
  salary_slip: "Salary slip",
  credit_card_bill: "Credit card bill",
  utility_bill: "Utility bill",
  receipt: "Receipt",
  other: "Other",
};

export function DocumentRow({
  document,
  onDeleted,
}: {
  document: DocumentDTO;
  onDeleted?: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const manual = document.manualData as Record<string, unknown>;

  async function handleDownload() {
    const result = await getDocumentDownloadUrlAction(document.id);
    if (result.success && result.downloadUrl) {
      window.open(result.downloadUrl, "_blank");
    } else {
      toast.error(result.error ?? "Download failed");
    }
  }

  async function handleDelete() {
    setPending(true);
    const result = await deleteDocumentAction(document.id);
    setPending(false);
    if (result.success) {
      toast.success("Document deleted");
      setDeleteOpen(false);
      onDeleted?.();
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex gap-3 min-w-0">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileText className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{document.fileName}</p>
            <Badge variant="secondary" className="text-xs">
              {typeLabels[document.type] ?? document.type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(document.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {" · "}
            {(document.size / 1024).toFixed(0)} KB
          </p>
          {typeof manual.netInHand === "number" ? (
            <p className="mt-1 text-sm tabular-nums">
              Net {formatINR(manual.netInHand as number)}/mo applied
            </p>
          ) : null}
          {typeof manual.totalDue === "number" ? (
            <p className="mt-1 text-sm tabular-nums">
              Due {formatINR(manual.totalDue as number)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button type="button" variant="ghost" size="icon-sm" onClick={handleDownload}>
          <Download className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              This removes the file from storage and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
