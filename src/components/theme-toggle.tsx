"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

type ThemeValue = (typeof options)[number]["value"];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className={cn("shrink-0", className)} disabled>
        <Sun className="size-4 opacity-50" />
      </Button>
    );
  }

  const active = theme ?? "system";
  const cycle: ThemeValue[] = ["light", "dark", "system"];
  const currentIndex = cycle.indexOf(active as ThemeValue);
  const next = cycle[(currentIndex + 1) % cycle.length];
  const Icon =
    resolvedTheme === "dark" ? Moon : active === "system" ? Monitor : Sun;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("shrink-0", className)}
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${active}. Switch to ${next}`}
    >
      <Icon className="size-4" />
    </Button>
  );
}

export function ThemeSelector({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const active = mounted ? (theme ?? "system") : "light";

  return (
    <div className={cn("inline-flex rounded-lg border border-border bg-muted/30 p-1", className)}>
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          disabled={!mounted}
          className={cn(
            "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            active === value
              ? "bg-background font-medium text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="size-3.5 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  );
}
