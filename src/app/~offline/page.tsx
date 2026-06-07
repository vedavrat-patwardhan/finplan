import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-heading text-2xl font-semibold">You&apos;re offline</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        FinPlan needs a connection to load your latest numbers. Check your network and try
        again.
      </p>
      <Button render={<Link href="/dashboard" />}>Go to dashboard</Button>
    </div>
  );
}
