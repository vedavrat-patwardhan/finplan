"use client";

import { useActionState, useEffect, useRef, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toggleAccountFavoriteAction } from "@/actions/ledger";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
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
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
      aria-pressed={isFavorite}
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        fd.set("id", accountId);
        startTransition(() => formAction(fd));
      }}
      className={cn(isFavorite && "text-brand-text", className)}
    >
      <Star className={cn("size-4", isFavorite && "fill-current")} />
    </Button>
  );
}
