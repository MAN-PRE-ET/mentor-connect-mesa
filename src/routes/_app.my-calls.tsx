import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Check, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CallsSkeleton } from "@/components/skeletons";
import { CallDetails } from "@/components/call-details";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStudent } from "@/lib/student";
import { listBookings, completeBooking } from "@/lib/booking.functions";
import { dayIST, isPastCall } from "@/lib/booking";
import { useWriteupKey } from "@/lib/writeup-key";
import { getGoalProgress, getProgress } from "@/lib/writeup.functions";

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
  const ownerKey = useWriteupKey(student?.id);
  const fetchProgress = useServerFn(getProgress);
  const progress = useQuery({ queryKey: ["progress", student?.id], queryFn: () => fetchProgress({ data: { studentId: student?.id ?? "", ownerKey } }), enabled: Boolean(student && ownerKey) });
  const fetchGoals = useServerFn(getGoalProgress);
  const goals = useQuery({ queryKey: ["goal-progress", student?.id], queryFn: () => fetchGoals({ data: { studentId: student?.id ?? "", ownerKey } }), enabled: Boolean(student && ownerKey) });
  const [error, setError] = useState("");
  const calls = useQuery({ queryKey: ["bookings", student?.id], queryFn: () => fetchCalls({ data: { studentId: student?.id ?? "" } }), enabled: ready && Boolean(student) });
  const mutation = useMutation({ mutationFn: (bookingId: string) => complete({ data: { studentId: student?.id ?? "", bookingId } }), onSuccess: () => { setError(""); queryClient.invalidateQueries({ queryKey: ["bookings"] }); queryClient.invalidateQueries({ queryKey: ["progress"] }); }, onError: e => setError(e.message) });
  const upcoming = (calls.data ?? []).filter(call => !isPastCall(call));
  const past = (calls.data ?? []).filter(call => isPastCall(call)).reverse();
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-8">
      <div className="mb-7 flex items-center gap-3"><CalendarClock className="size-7 text-primary" /><div><h1 className="text-2xl font-semibold">My Calls</h1><p className="mt-1 text-sm text-muted-foreground">Demo availability · all times in IST</p></div></div>
      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
      {!ready || (student && calls.isPending) ? <CallsSkeleton /> : calls.isError ? <div><p role="alert" className="text-destructive">{calls.error.message}</p><Button variant="outline" className="mt-3" onClick={() => calls.refetch()}>Try again</Button></div> : <Tabs defaultValue="upcoming">
        <TabsList><TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger><TabsTrigger value="past">Past ({past.length})</TabsTrigger></TabsList>
        {([ ["upcoming", upcoming], ["past", past] ] as const).map(([tab, items]) => <TabsContent key={tab} value={tab} className="mt-6">
          {items.length ? <div className="grid items-start gap-5 md:grid-cols-2">{items.map(call => <Card key={call.id} className="rounded-2xl p-5 shadow-card"><CallDetails call={call} /><div className="mt-5 flex flex-wrap items-center gap-3">{call.status === "upcoming" && <><Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate(call.id)}><Check />{mutation.isPending && mutation.variables === call.id ? "Updating…" : "Mark as completed"}</Button><span className="text-xs text-muted-foreground">Demo only</span></>}{call.status === "completed" && <><Button variant="outline" size="sm" asChild><Link to="/writeup/$bookingId" params={{ bookingId: call.id }}><FileText />{progress.data?.find(item => item.bookingId === call.id)?.ready ? "View write-up" : "Generate write-up"}</Link></Button>{progress.data?.find(item => item.bookingId === call.id)?.ready && <span className="flex items-center gap-1 text-xs text-success"><Check className="size-3" />Write-up ready</span>}</>}</div></Card>)}</div> : <div className="flex flex-col items-center gap-3 py-16 text-center"><CalendarClock className="size-10 text-muted-foreground" /><h2 className="text-lg font-semibold">{tab === "upcoming" ? "No upcoming calls yet" : "No past calls yet"}</h2><p className="max-w-sm text-sm text-muted-foreground">{tab === "upcoming" ? "Find a mentor to talk through your next step." : "Your completed calls will appear here."}</p><Button variant="outline" asChild><Link to="/">Find a mentor</Link></Button></div>}
        </TabsContent>)}
      </Tabs>}
      <section className="mt-12 border-t pt-8"><h2 className="text-xl font-semibold">My progress</h2>{goals.isError ? <div className="mt-4"><p role="alert" className="text-sm text-destructive">{goals.error.message}</p><Button variant="outline" className="mt-3" onClick={() => goals.refetch()}>Try again</Button></div> : student && goals.isPending ? <p role="status" className="mt-4 text-sm text-muted-foreground">Loading your progress…</p> : goals.data?.length ? <div className="mt-6 space-y-9">{goals.data.map(goal => { const total = goal.open + goal.done; const pct = total ? Math.round((goal.done / total) * 100) : 0; return <div key={goal.conversationId ?? goal.goal}><h3 className="font-medium text-balance">{goal.goal || goal.title || "Your goal"}</h3><div className="mt-3 flex items-center gap-3"><div role="progressbar" aria-valuenow={goal.done} aria-valuemin={0} aria-valuemax={total} aria-label="Action items completed" className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div><span className="shrink-0 text-sm text-muted-foreground">{goal.done} of {total} done</span></div><ol className="mt-5 space-y-5 border-l-2 pl-5">{goal.calls.map(call => <li key={call.bookingId} className="relative"><span className="absolute -left-7 top-1 size-3 rounded-full bg-primary" /><p className="text-xs text-muted-foreground">{dayIST(call.startTime)}</p><h4 className="mt-1 font-medium">{call.mentorName}</h4><div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2"><span className="text-sm text-muted-foreground">{call.ready ? `${call.open} open · ${call.done} done` : "No write-up yet"}</span><Button variant="link" className="h-auto p-0" asChild><Link to="/writeup/$bookingId" params={{ bookingId: call.bookingId }}>{call.ready ? "View write-up" : "Generate write-up"}</Link></Button></div></li>)}</ol></div>; })}</div> : <p className="mt-4 text-sm text-muted-foreground">Your completed calls and action items will appear here.</p>}</section>
    </div>
  );
}
