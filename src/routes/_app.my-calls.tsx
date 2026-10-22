import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_app/my-calls")({
  head: () => ({
    meta: [
      { title: "My Calls — Mentor Connect" },
      {
        name: "description",
        content: "Your booked mentor calls — coming soon in Mentor Connect by Mesa School of Business.",
      },
      { property: "og:title", content: "My Calls — Mentor Connect" },
      {
        property: "og:description",
        content: "Your booked mentor calls — coming soon in Mentor Connect by Mesa School of Business.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyCalls,
});

function MyCalls() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="animate-message-in flex max-w-md flex-col items-center gap-3 rounded-2xl p-8 text-center shadow-card">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <CalendarClock className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">Call bookings are coming soon</h1>
        <p className="text-sm text-muted-foreground">
          After a chat, you'll be able to book a call with a mentor and find your bookings and write-ups here — each
          one linked back to the conversation that led to it.
        </p>
        <Button variant="outline" className="mt-2 rounded-xl" onClick={() => navigate({ to: "/" })}>
          Back to the start
        </Button>
      </Card>
    </div>
  );
}
