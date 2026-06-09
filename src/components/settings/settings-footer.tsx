"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/theme-toggle";

export function SettingsFooter() {
  return (
    <div className="sticky bottom-16 z-20 -mx-4 border-t border-border bg-background/95 px-4 py-4 backdrop-blur-md md:bottom-0 md:-mx-8 md:px-8">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Appearance</p>
            <p className="text-xs text-muted-foreground">
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
    </div>
  );
}
