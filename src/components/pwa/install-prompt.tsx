"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "finplan-install-dismissed";
const DISMISS_UNTIL_KEY = "finplan-install-dismiss-until";
/** Don't show again for 14 days after dismiss. */
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
/** Wait at least 3 visits before showing on a new device. */
const MIN_VISITS_BEFORE_PROMPT = 3;
const VISIT_COUNT_KEY = "finplan-install-visits";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 768px)").matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (!isMobileDevice() || isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "installed") return;

    const dismissUntil = Number(localStorage.getItem(DISMISS_UNTIL_KEY) || 0);
    if (dismissUntil > Date.now()) return;

    const visits = Number(localStorage.getItem(VISIT_COUNT_KEY) || 0) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(visits));
    if (visits < MIN_VISITS_BEFORE_PROMPT) return;

    if (isIosSafari()) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + DISMISS_COOLDOWN_MS));
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(DISMISS_KEY, "installed");
    }
    setInstallEvent(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="np-plunk fixed inset-x-4 bottom-20 z-50 border border-border bg-card p-4 md:hidden">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center bg-brand text-brand-foreground">
          {iosHint ? <Share className="size-5" /> : <Download className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Add FinPlan to home screen</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {iosHint
              ? "Tap Share, then “Add to Home Screen” for quick access like a native app."
              : "Install the app for faster launch and a full-screen experience."}
          </p>
          <div className="mt-3 flex gap-2">
            {!iosHint ? (
              <Button size="sm" variant="brand" onClick={install}>
                Install
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={dismiss}
          className="shrink-0"
          aria-label="Dismiss install prompt"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
