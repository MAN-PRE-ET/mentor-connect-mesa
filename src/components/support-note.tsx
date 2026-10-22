import { LifeBuoy } from "lucide-react";
import { Card } from "@/components/ui/card";

/** Warm support card shown when a student seems distressed. */
export function SupportNote() {
  return (
    <Card className="gap-2 rounded-2xl border-primary/20 bg-accent/60 p-4">
      <div className="flex items-center gap-2 text-accent-foreground">
        <LifeBuoy className="size-4" />
        <span className="text-sm font-semibold">If you need someone to talk to</span>
      </div>
      <p className="text-sm text-accent-foreground/90">
        Tele-MANAS (India): <span className="font-semibold">14416</span> — free, confidential
        support, available any time. There's no rush here; we can pick the career chat back up
        whenever you're ready.
      </p>
    </Card>
  );
}
