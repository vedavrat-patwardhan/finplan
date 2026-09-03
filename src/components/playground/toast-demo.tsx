"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => toast.success("Transaction saved")}>
        success
      </Button>
      <Button variant="secondary" onClick={() => toast.error("Could not reach the bank")}>
        error
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast.warning("Budget almost exhausted")}
      >
        warning
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast.info("Statement ready to download")}
      >
        info
      </Button>
      <Button variant="secondary" onClick={() => toast.loading("Syncing ledger…")}>
        loading
      </Button>
    </div>
  );
}
