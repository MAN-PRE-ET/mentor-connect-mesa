import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CallDetails } from "@/components/call-details";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStudent } from "@/lib/student";
import { listBookings, completeBooking } from "@/lib/booking.functions";
import { isPastCall } from "@/lib/booking";

export const Route = createFileRoute("/_app/my-calls")({
  head: () => ({
    meta: [
      { title: "My Calls — Mentor Connect" },
      {
        name: "description",
        content:
          "Manage upcoming and past mentor calls, goals, and discussion notes in Mentor Connect.",
      },
      { property: "og:title", content: "My Calls — Mentor Connect" },
      {
        property: "og:description",
        content:
          "Manage upcoming and past mentor calls, goals, and discussion notes in Mentor Connect.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyCalls,
});

function MyCalls() {
  const { student, ready } = useStudent();
  const queryClient = useQueryClient();
  const fetchCalls = useServerFn(listBookings);
  const complete = useServerFn(completeBooking);
  const [error, setError] = useState("");
  const calls = useQuery({ queryKey: ["bookings", student?.id], queryFn: () => fetchCalls({ data: { studentId: student?.id ?? "" } }), enabled: ready && Boolean(student) });
  const mutation = useMutation({ mutationFn: (bookingId: string) => complete({ data: { studentId: student?.id ?? "", bookingId } }), onSuccess: () => { setError(""); queryClient.invalidateQueries({ queryKey: ["bookings"] }); }, onError: e => setError(e.message) });
  const upcoming = (calls.data ?? []).filter(call => !isPastCall(call));
  const past = (calls.data ?? []).filter(call => isPastCall(call)).reverse();
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-8">
      <div className="mb-7 flex items-center gap-3"><CalendarClock className="size-7 text-primary" /><div><h1 className="text-2xl font-semibold">My Calls</h1><p className="mt-1 text-sm text-muted-foreground">Demo availability · all times in IST</p></div></div>
      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
      {!ready || (student && calls.isPending) ? <p role="status" className="py-12 text-center text-muted-foreground">Loading your calls…</p> : calls.isError ? <div><p role="alert" className="text-destructive">{calls.error.message}</p><Button variant="outline" className="mt-3" onClick={() => calls.refetch()}>Try again</Button></div> : <Tabs defaultValue="upcoming">
        <TabsList><TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger><TabsTrigger value="past">Past ({past.length})</TabsTrigger></TabsList>
        {([ ["upcoming", upcoming], ["past", past] ] as const).map(([tab, items]) => <TabsContent key={tab} value={tab} className="mt-6">
          {items.length ? <div className="grid items-start gap-5 md:grid-cols-2">{items.map(call => <Card key={call.id} className="rounded-2xl p-5 shadow-card"><CallDetails call={call} /><div className="mt-5 flex flex-wrap items-center gap-3">{call.status === "upcoming" && <><Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate(call.id)}><Check />{mutation.isPending && mutation.variables === call.id ? "Updating…" : "Mark as completed"}</Button><span className="text-xs text-muted-foreground">Demo only</span></>}</div></Card>)}</div> : <div className="flex flex-col items-center gap-3 py-16 text-center"><CalendarClock className="size-10 text-muted-foreground" /><h2 className="text-lg font-semibold">{tab === "upcoming" ? "No upcoming calls yet" : "No past calls yet"}</h2><p className="max-w-sm text-sm text-muted-foreground">{tab === "upcoming" ? "Find a mentor to talk through your next step." : "Your completed calls will appear here."}</p><Button variant="outline" asChild><Link to="/">Find a mentor</Link></Button></div>}
        </TabsContent>)}
      </Tabs>}
    </div>
  );
}
