"use client";

import { useActionState, useEffect, useRef, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toggleAccountFavoriteAction } from "@/actions/ledger";
import type { ActionResult } from "@/actions/auth";
import { cn } from "@/lib/utils";

const initialState: ActionResult = { success: false };

export function FavoriteAccountButton({
  accountId,
  isFavorite,
  className,
}: {
  accountId: string;
  isFavorite: boolean;
  className?: string;
}) {
  const router = useRouter();
  const wasPending = useRef(false);
  const [state, formAction, pending] = useActionState(toggleAccountFavoriteAction, initialState);

  useEffect(() => {
    if (wasPending.current && !pending && state.success) {
      router.refresh();
    }
    wasPending.current = pending;
  }, [pending, router, state.success]);

  return (
    <button
      type="button"
      aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
      aria-pressed={isFavorite}
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        fd.set("id", accountId);
        startTransition(() => formAction(fd));
      }}
      className={cn(
        "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-50",
        isFavorite && "border-chart-3/30 bg-chart-3/10 text-chart-3 hover:text-chart-3",
        className
      )}
    >
      <Star className={cn("size-4", isFavorite && "fill-current")} />
    </button>
  );
}
