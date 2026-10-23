import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Printer, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useStudent } from "@/lib/student";
import { useWriteupKey } from "@/lib/writeup-key";
import { getWriteup, summarize, setActionDone } from "@/lib/writeup.functions";
import { dayIST, timeIST } from "@/lib/booking";

export const Route = createFileRoute("/_app/writeup/$bookingId")({
  head: () => ({ meta: [
    { title: "Call Write-up — Mentor Connect" },
    { name: "description", content: "Your private mentor-call discussion, agreed actions and follow-up in Mentor Connect." },
    { property: "og:title", content: "Call Write-up — Mentor Connect" },
    { property: "og:description", content: "Review your mentor-call discussion and track the actions you agreed." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: WriteupPage,
});

function WriteupPage() {
  const { bookingId } = Route.useParams();
  const { student, ready } = useStudent();
  const ownerKey = useWriteupKey(student?.id);
  const fetchWriteup = useServerFn(getWriteup);
  const generate = useServerFn(summarize);
  const toggle = useServerFn(setActionDone);
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState("");
  const data = { studentId: student?.id ?? "", bookingId, ownerKey };
  const writeup = useQuery({ queryKey: ["writeup", student?.id, bookingId], queryFn: () => fetchWriteup({ data }), enabled: Boolean(student && ownerKey) });
  const create = useMutation({ mutationFn: () => generate({ data: { ...data, notes } }), onSuccess: result => {
    if (!result.ok) { setNotice(result.message); return; }
    setNotice(""); queryClient.invalidateQueries({ queryKey: ["writeup"] }); queryClient.invalidateQueries({ queryKey: ["progress"] });
  }, onError: () => setNotice("We couldn't create your write-up. Your notes are still here; please try again.") });
  const action = useMutation({ mutationFn: ({ actionId, done }: { actionId: string; done: boolean }) => toggle({ data: { studentId: data.studentId, ownerKey, actionId, done } }), onSuccess: () => { setNotice(""); queryClient.invalidateQueries({ queryKey: ["writeup"] }); queryClient.invalidateQueries({ queryKey: ["progress"] }); }, onError: () => setNotice("The checkbox couldn't be saved. Please try again.") });
  const context = writeup.data;
  const summary = context?.summary;
  return <div className="writeup-page mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8">
    <Button variant="link" className="print-hidden mb-6 h-auto p-0" asChild><Link to="/my-calls"><ArrowLeft />My Calls</Link></Button>
    {!ready || (student && !ownerKey) || (student && writeup.isPending) ? <p role="status">Loading your write-up…</p> : !student ? <p>Return to My Calls using the browser where you booked your call.</p> : writeup.isError ? <div><p role="alert" className="text-destructive">{writeup.error.message}</p><Button variant="outline" className="mt-4" onClick={() => writeup.refetch()}>Try again</Button></div> : context && <>
      <header className="mb-8 border-b pb-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><FileText className="mb-3 size-7 text-primary" /><h1 className="text-2xl font-semibold">{summary ? "Call write-up" : "Generate write-up"}</h1><p className="mt-2 font-medium">{context.call.mentorName}</p><p className="mt-1 text-sm text-muted-foreground">{dayIST(context.call.startTime)} · {timeIST(context.call.startTime)} IST</p></div>{summary && <Button variant="outline" className="print-hidden" onClick={() => window.print()}><Printer />Print / Save as PDF</Button>}</div><p className="mt-5 text-xs font-medium text-muted-foreground">Your goal</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{context.call.problemSummary}</p></header>
      {notice && <p role="alert" className="print-hidden mb-5 rounded-lg border border-caution p-4 text-sm">{notice}</p>}
      {!summary ? <form className="space-y-4" onSubmit={event => { event.preventDefault(); setNotice(""); create.mutate(); }}><label htmlFor="call-notes" className="block font-medium">Your call notes or transcript</label><Textarea id="call-notes" className="min-h-64" value={notes} onChange={event => setNotes(event.target.value)} maxLength={30000} disabled={create.isPending} placeholder="Paste what you discussed and the actions you agreed to…" /><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{notes.trim().split(/\s+/).filter(Boolean).length} words</span><Button type="submit" disabled={create.isPending || !notes.trim()}><Sparkles />{create.isPending ? "Creating write-up…" : "Create write-up"}</Button></div>{create.isPending && <p role="status" className="text-sm text-muted-foreground">Checking your notes and source quotes…</p>}</form> : <div className="space-y-9">
        <section><h2 className="mb-4 text-lg font-semibold">What we discussed</h2>{summary.discussed.length ? <ul className="space-y-4">{summary.discussed.map((item, index) => <li key={index} className="break-words"><p>{item.point}</p><blockquote className="mt-2 border-l-2 pl-3 text-sm text-muted-foreground">“{item.source_quote}”</blockquote></li>)}</ul> : <p className="text-sm text-muted-foreground">No separate discussion points recorded.</p>}</section>
        <section><h2 className="mb-4 text-lg font-semibold">Your action items</h2>{context.actions.length ? <ul className="divide-y">{context.actions.map(item => <li key={item.id} className="flex items-start gap-3 py-4"><Checkbox id={item.id} className="mt-1" checked={item.done} disabled={action.isPending} onCheckedChange={checked => action.mutate({ actionId: item.id, done: checked === true })} /><label htmlFor={item.id} className="min-w-0 cursor-pointer break-words"><span className={item.done ? "text-muted-foreground line-through" : ""}>{item.task}</span>{item.timeframe && <p className="mt-1 text-xs text-muted-foreground">{item.timeframe}</p>}{summary.action_items.find(source => source.task === item.task)?.source_quote && <blockquote className="mt-2 border-l-2 pl-3 text-sm text-muted-foreground">“{summary.action_items.find(source => source.task === item.task)?.source_quote}”</blockquote>}</label></li>)}</ul> : <p className="text-sm text-muted-foreground">No action items agreed in these notes.</p>}</section>
        <section><h2 className="mb-3 text-lg font-semibold">Next steps</h2><p className="whitespace-pre-wrap break-words text-sm">{summary.next_steps || "No next steps recorded in your notes."}</p></section>
        <section><h2 className="mb-3 text-lg font-semibold">Suggested follow-up</h2><p className="whitespace-pre-wrap break-words text-sm">{summary.suggested_followup_topic || "No follow-up topic recorded in your notes."}</p></section>
      </div>}
    </>}
  </div>;
}