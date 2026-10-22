import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const MESSAGES: Record<string, string> = {
  mentors_unavailable:
    "We couldn't load the mentor roster right now, so we can't give you a grounded answer. Please try again in a moment.",
  ai_unavailable: "The matching service didn't respond. Nothing was lost — please try again.",
  send_failed: "Something went wrong while sending your message. Please try again.",
};

export function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card className="animate-message-in flex-col items-start gap-2 rounded-2xl border-destructive/30 p-4">
      <p className="text-sm font-medium">That didn't work</p>
      <p className="text-sm text-muted-foreground">{MESSAGES[error] ?? MESSAGES.send_failed}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}
