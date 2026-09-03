"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload, KeyRound, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/ui/labeled-select";
import { PasswordInput } from "@/components/ui/password-input";
import { DOCUMENT_TYPES } from "@/lib/finance/constants";
import {
  createDocumentAction,
  getPresignedUploadUrlAction,
  createSavedPasswordAction,
} from "@/actions/ledger";
import type { SavedPasswordDTO } from "@/lib/db/queries/ledger";

const typeLabels: Record<string, string> = {
  salary_slip: "Salary slip",
  bank_statement: "Bank statement",
  credit_card_bill: "Credit card bill",
  utility_bill: "Utility bill",
  receipt: "Receipt",
  other: "Other",
};

// Bank statements use the dedicated local-extraction flow above, not the file uploader.
const UPLOADER_TYPES = DOCUMENT_TYPES.filter((t) => t !== "bank_statement");

const PASSWORD_APPLICABLE_TYPES = new Set(["credit_card_bill", "utility_bill", "other"]);

function SavePasswordInline({
  passwordValue,
  onSaved,
}: {
  passwordValue: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startSaving] = useTransition();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("title", title);
    fd.set("value", passwordValue);
    startSaving(async () => {
      const result = await createSavedPasswordAction({ success: false }, fd);
      if (result.success) {
        toast.success("Password saved");
        setOpen(false);
        setTitle("");
        onSaved();
      } else {
        toast.error(result.error ?? "Could not save password");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        onClick={() => setOpen(true)}
      >
        <KeyRound className="size-3" />
        Save this password for later
      </button>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-2 border border-border bg-muted p-3">
      <p className="np-caps text-muted-foreground">Save password as</p>
      <div className="flex gap-2">
        <Input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. HDFC Debit password"
          className="h-8 text-sm"
          required
        />
        <Button type="submit" size="sm" className="shrink-0" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function DocumentUpload({
  savedPasswords = [],
  onUploaded,
}: {
  savedPasswords?: SavedPasswordDTO[];
  onUploaded?: (documentId: string, type: string, password?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<string>("receipt");
  const [uploading, setUploading] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedSavedId, setSelectedSavedId] = useState<string>("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const showPassword = PASSWORD_APPLICABLE_TYPES.has(docType);

  async function handleFile(file: File) {
    setUploading(true);

    const urlResult = await getPresignedUploadUrlAction(file.name, file.type, file.size);

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
        onUploaded?.(createResult.documentId, docType, password || undefined);
        setPassword("");
        setSelectedSavedId("");
        setPasswordSaved(false);
        setShowPasswordSection(false);
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
    <div className="border border-border bg-card p-5 space-y-4">
      <div className="space-y-2">
        <Label>Document type</Label>
        <LabeledSelect
          value={docType}
          onValueChange={(v) => {
            setDocType(v);
            setShowPasswordSection(false);
            setPassword("");
            setSelectedSavedId("");
          }}
          options={UPLOADER_TYPES.map((t) => ({
            value: t,
            label: typeLabels[t] ?? t,
          }))}
          placeholder="Select type"
        />
      </div>

      {showPassword && (
        <div className="space-y-2">
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setShowPasswordSection((v) => !v)}
          >
            <span className="flex items-center gap-1.5">
              <KeyRound className="size-3.5" />
              PDF password (optional)
            </span>
            {showPasswordSection ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>

          {showPasswordSection && (
            <div className="space-y-3 border border-border bg-muted p-3">
              {savedPasswords.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Use saved password</Label>
                  <LabeledSelect
                    value={selectedSavedId}
                    onValueChange={(id) => {
                      setSelectedSavedId(id);
                      setPassword("");
                    }}
                    options={[
                      { value: "", label: "Type manually" },
                      ...savedPasswords.map((p) => ({ value: p.id, label: p.title })),
                    ]}
                    placeholder="Select saved password"
                  />
                </div>
              )}

              {!selectedSavedId && (
                <div className="space-y-1.5">
                  <Label htmlFor="doc-password" className="text-xs">
                    {savedPasswords.length > 0 ? "Or type manually" : "Password / PIN"}
                  </Label>
                  <PasswordInput
                    id="doc-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordSaved(false);
                    }}
                    placeholder="Enter PDF password"
                    className="h-8 text-sm"
                  />
                  {password && !passwordSaved && (
                    <SavePasswordInline
                      passwordValue={password}
                      onSaved={() => setPasswordSaved(true)}
                    />
                  )}
                  {passwordSaved && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <KeyRound className="size-3" />
                      Password saved
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className="cursor-pointer border border-dashed border-input bg-card px-6 py-10 text-center transition-colors hover:border-foreground/40"
      >
        <div className="mx-auto flex size-12 items-center justify-center bg-muted text-muted-foreground">
          <Upload className="size-5" />
        </div>
        <p className="mt-3 font-bold">
          {uploading ? "Uploading..." : "Upload PDF or photo"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Max 10 MB · PDF, JPEG, PNG, WebP</p>
        {uploading ? (
          <div className="mx-auto mt-4 h-2 w-full max-w-xs bg-muted">
            <div className="h-full w-2/3 animate-pulse bg-brand" />
          </div>
        ) : (
          <Button
            type="button"
            className="mt-4"
            disabled={uploading}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Browse files
          </Button>
        )}
      </div>
    </div>
  );
}
