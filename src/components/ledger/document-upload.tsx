"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOCUMENT_TYPES } from "@/lib/finance/constants";
import {
  createDocumentAction,
  getPresignedUploadUrlAction,
} from "@/actions/ledger";
import { Upload } from "lucide-react";

const typeLabels: Record<string, string> = {
  salary_slip: "Salary slip",
  credit_card_bill: "Credit card bill",
  utility_bill: "Utility bill",
  receipt: "Receipt",
  other: "Other",
};

export function DocumentUpload({
  onUploaded,
}: {
  onUploaded?: (documentId: string, type: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<string>("receipt");
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);

    const urlResult = await getPresignedUploadUrlAction(
      file.name,
      file.type,
      file.size
    );

    if (!urlResult.success || !urlResult.uploadUrl || !urlResult.s3Key) {
      toast.error(urlResult.error ?? "Upload failed");
      setUploading(false);
      return;
    }

    try {
      const uploadRes = await fetch(urlResult.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("S3 upload failed");

      const fd = new FormData();
      fd.set("type", docType);
      fd.set("s3Key", urlResult.s3Key);
      fd.set("fileName", file.name);
      fd.set("mimeType", file.type);
      fd.set("size", String(file.size));

      const createResult = await createDocumentAction({ success: false }, fd);

      if (createResult.success && createResult.documentId) {
        toast.success("Document uploaded");
        onUploaded?.(createResult.documentId, docType);
      } else {
        toast.error(createResult.error ?? "Failed to save document");
      }
    } catch {
      toast.error("Upload failed. Check S3 configuration.");
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="space-y-2">
        <Label>Document type</Label>
        <Select value={docType} onValueChange={(v) => v && setDocType(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {typeLabels[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <Button
        type="button"
        className="h-11 w-full gap-2"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-4" />
        {uploading ? "Uploading..." : "Upload PDF or photo"}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Max 10 MB · PDF, JPEG, PNG, WebP
      </p>
    </div>
  );
}
