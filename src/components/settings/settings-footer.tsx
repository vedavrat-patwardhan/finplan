"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/theme-toggle";

export function SettingsFooter() {
  return (
    <div className="space-y-3 border-t border-border pt-6">
      <div className="flex flex-col gap-3 border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="np-caps text-muted-foreground">Appearance</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Light, dark, or match your system
          </p>
        </div>
        <ThemeSelector />
      </div>
      <form action={logoutAction}>
        <Button
          type="submit"
          variant="outline"
          className="min-h-11 w-full justify-center gap-2 sm:w-auto"
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </form>
    </div>
  );
}
