import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, FileText, ListTree, MessageCircle, Mic, Pencil, Printer, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStudent } from "@/lib/student";
import { useWriteupKey } from "@/lib/writeup-key";
import { breakdown, getWriteup, manageStep, setActionDone, summarize } from "@/lib/writeup.functions";
import { combineRecap, emptyRecap, notesWordCount, orderedActionItems, RECAP_FIELDS, type RecapValues, type SavedAction } from "@/lib/writeup";
import { friendInviteUrl } from "@/lib/app-url";
import { useDictation } from "@/hooks/use-dictation";
import { dayIST, timeIST } from "@/lib/booking";

export const Route = createFileRoute("/_app/writeup/$bookingId")({
  head: () => ({ meta: [
    { title: "Notes from your call — Mentor Connect" },
    { name: "description", content: "Your private mentor-call discussion, agreed actions and follow-up in Mentor Connect." },
    { property: "og:title", content: "Notes from your call — Mentor Connect" },
    { property: "og:description", content: "Review your mentor-call discussion and track the actions you agreed." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: WriteupPage,
});

function RecapField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
  const { supported, listening, toggle } = useDictation(text => onChange(value ? `${value} ${text}` : text));
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="relative mt-1">
        <Textarea className="min-h-20" value={value} onChange={event => onChange(event.target.value)} disabled={disabled} placeholder="Speak or type…" />
        {supported && <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 bottom-1.5 size-8 text-muted-foreground" aria-label={listening ? `Stop dictating ${label}` : `Dictate ${label}`} aria-pressed={listening} disabled={disabled} onClick={toggle}><Mic className={listening ? "animate-soft-pulse text-destructive" : ""} /></Button>}
      </div>
    </div>
  );
}

function SuggestedSteps({ parent, steps, onChanged, setNotice }: { parent: SavedAction; steps: SavedAction[]; onChanged: () => void; setNotice: (value: string) => void }) {
  const { student } = useStudent();
  const ownerKey = useWriteupKey(student?.id);
  const manage = useServerFn(manageStep);
  const toggle = useServerFn(setActionDone);
  const [editingId, setEditingId] = useState("");
  const [editingText, setEditingText] = useState("");
  const mutation = useMutation({
    mutationFn: (input: { actionId: string; action: "accept" | "edit" | "delete"; task?: string }) => manage({ data: { studentId: student?.id ?? "", ownerKey, ...input } }),
    onSuccess: () => { setNotice(""); setEditingId(""); onChanged(); },
    onError: e => setNotice(e.message),
  });
  const doneMutation = useMutation({
    mutationFn: (input: { actionId: string; done: boolean }) => toggle({ data: { studentId: student?.id ?? "", ownerKey, ...input } }),
    onSuccess: () => { setNotice(""); onChanged(); },
    onError: () => setNotice("The checkbox couldn't be saved. Please try again."),
  });
  if (!steps.length) return null;
  return <ul className="mt-2 ml-7 space-y-2 border-l-2 pl-4">
    {steps.map(step => step.kind === "suggested" ? <li key={step.id} className="text-sm">
      {editingId === step.id ? <div className="flex items-center gap-2"><Input value={editingText} maxLength={300} onChange={event => setEditingText(event.target.value)} aria-label="Edit step" /><Button variant="outline" size="sm" disabled={mutation.isPending || !editingText.trim()} onClick={() => mutation.mutate({ actionId: step.id, action: "edit", task: editingText })}>Save</Button><Button variant="ghost" size="sm" onClick={() => setEditingId("")}><X />Cancel</Button></div> : <>
        <p className="break-words text-muted-foreground">{step.task}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1"><Badge variant="outline" className="text-xs">AI-suggested, not from your mentor</Badge>
          <Button variant="link" className="h-auto p-0 text-xs" disabled={mutation.isPending} onClick={() => mutation.mutate({ actionId: step.id, action: "accept" })}><Check />Accept</Button>
          <Button variant="link" className="h-auto p-0 text-xs" disabled={mutation.isPending} onClick={() => { setEditingId(step.id); setEditingText(step.task); }}><Pencil />Edit</Button>
          <Button variant="link" className="h-auto p-0 text-xs text-destructive" disabled={mutation.isPending} onClick={() => mutation.mutate({ actionId: step.id, action: "delete" })}><Trash2 />Delete</Button>
        </div>
      </>}
    </li> : <li key={step.id} className="flex items-start gap-3 text-sm">
      <Checkbox id={step.id} className="mt-1" checked={step.done} disabled={doneMutation.isPending} onCheckedChange={checked => doneMutation.mutate({ actionId: step.id, done: checked === true })} />
      <label htmlFor={step.id} className={`min-w-0 cursor-pointer break-words ${step.done ? "text-muted-foreground line-through" : ""}`}>{step.task}</label>
    </li>)}
  </ul>;
}

function WriteupPage() {
  const { bookingId } = Route.useParams();
  const { student, ready } = useStudent();
  const ownerKey = useWriteupKey(student?.id);
  const fetchWriteup = useServerFn(getWriteup);
  const generate = useServerFn(summarize);
  const toggle = useServerFn(setActionDone);
  const split = useServerFn(breakdown);
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"recap" | "paste">("recap");
  const [recap, setRecap] = useState<RecapValues>(emptyRecap);
  const [pasted, setPasted] = useState("");
  const [notice, setNotice] = useState("");
  const data = { studentId: student?.id ?? "", bookingId, ownerKey };
  const writeup = useQuery({ queryKey: ["writeup", student?.id, bookingId], queryFn: () => fetchWriteup({ data }), enabled: Boolean(student && ownerKey) });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ["writeup"] }); queryClient.invalidateQueries({ queryKey: ["progress"] }); queryClient.invalidateQueries({ queryKey: ["goal-progress"] }); };
  const notes = mode === "paste" ? pasted.trim() : combineRecap(recap);
  const create = useMutation({ mutationFn: () => generate({ data: { ...data, notes } }), onSuccess: result => {
    if (!result.ok) { setNotice(result.message); return; }
    setNotice(""); refresh();
  }, onError: () => setNotice("We couldn't create your write-up. Your notes are still here; please try again.") });
  const action = useMutation({ mutationFn: ({ actionId, done }: { actionId: string; done: boolean }) => toggle({ data: { studentId: data.studentId, ownerKey, actionId, done } }), onSuccess: () => { setNotice(""); refresh(); }, onError: () => setNotice("The checkbox couldn't be saved. Please try again.") });
  const breakdownMutation = useMutation({ mutationFn: (actionId: string) => split({ data: { ...data, actionId } }), onSuccess: result => { if (!result.ok) { setNotice(result.message); return; } setNotice(""); refresh(); }, onError: () => setNotice("We couldn't split this into small steps. Please try again.") });
  const context = writeup.data;
  const summary = context?.summary;
  const topItems = context?.actions.filter(item => !item.parentId) ?? [];
  const childrenOf = (id: string) => context?.actions.filter(item => item.parentId === id) ?? [];
  const goal = context?.call.problemSummary ?? "";
  const inviteUrl = friendInviteUrl(goal);
  const nextSteps = context ? orderedActionItems(topItems, context.call.startTime) : [];
  return <div className="writeup-page mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8">
    <Button variant="link" className="print-hidden mb-6 h-auto p-0" asChild><Link to="/my-calls"><ArrowLeft />My Calls</Link></Button>
    {!ready || (student && !ownerKey) || (student && writeup.isPending) ? <p role="status">Loading your write-up…</p> : !student ? <p>Return to My Calls using the browser where you booked your call.</p> : writeup.isError ? <div><p role="alert" className="text-destructive">{writeup.error.message}</p><Button variant="outline" className="mt-4" onClick={() => writeup.refetch()}>Try again</Button></div> : context && <>
      <header className="mb-8 border-b pb-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><FileText className="mb-3 size-7 text-primary" /><h1 className="text-2xl font-semibold text-balance">Notes from your call, organized by Mentor Connect</h1><p className="mt-2 font-medium">{context.call.mentorName}</p><p className="mt-1 text-sm text-muted-foreground">{dayIST(context.call.startTime)} · {timeIST(context.call.startTime)} IST</p></div><div className="print-hidden flex flex-wrap gap-2">{summary && <Button variant="outline" onClick={() => window.print()}><Printer />Print / Save as PDF</Button>}<Button variant="outline" asChild><a href={inviteUrl} target="_blank" rel="noopener noreferrer"><MessageCircle />Invite a friend</a></Button></div></div><p className="mt-5 text-xs font-medium text-muted-foreground">Your goal</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{context.call.problemSummary}</p></header>
      {notice && <p role="alert" className="print-hidden mb-5 rounded-lg border border-caution p-4 text-sm">{notice}</p>}
      {!summary ? <div className="space-y-4">
        <Tabs value={mode} onValueChange={value => setMode(value as "recap" | "paste")}>
          <TabsList><TabsTrigger value="recap">Quick recap</TabsTrigger><TabsTrigger value="paste">Paste notes or transcript</TabsTrigger></TabsList>
          <TabsContent value="recap" className="mt-4 space-y-4">{RECAP_FIELDS.map(field => <RecapField key={field.key} label={field.label} value={recap[field.key]} onChange={value => setRecap(current => ({ ...current, [field.key]: value }))} disabled={create.isPending} />)}</TabsContent>
          <TabsContent value="paste" className="mt-4"><label htmlFor="call-notes" className="block font-medium">Your call notes or transcript</label><Textarea id="call-notes" className="mt-1 min-h-64" value={pasted} onChange={event => setPasted(event.target.value)} maxLength={30000} disabled={create.isPending} placeholder="Paste what you discussed and the actions you agreed to…" /></TabsContent>
        </Tabs>
        <form className="flex flex-wrap items-center justify-between gap-3" onSubmit={event => { event.preventDefault(); setNotice(""); create.mutate(); }}>
          <span className="text-xs text-muted-foreground">{notesWordCount(notes)} words</span>
          <Button type="submit" disabled={create.isPending || !notes}><Sparkles />{create.isPending ? "Creating write-up…" : "Create write-up"}</Button>
        </form>
        {create.isPending && <p role="status" className="text-sm text-muted-foreground">Checking your notes and source quotes…</p>}
      </div> : <div className="space-y-9">
        <section><h2 className="mb-4 text-lg font-semibold">What we discussed</h2>{summary.discussed.length ? <ul className="space-y-4">{summary.discussed.map((item, index) => <li key={index} className="break-words"><p>{item.point}</p><blockquote className="mt-2 border-l-2 pl-3 text-sm text-muted-foreground">“{item.source_quote}”</blockquote></li>)}</ul> : <p className="text-sm text-muted-foreground">No separate discussion points recorded.</p>}</section>
        <section><h2 className="mb-4 text-lg font-semibold">Your action items</h2>{topItems.length ? <ul className="divide-y">{topItems.map(item => <li key={item.id} className="py-4"><div className="flex items-start gap-3"><Checkbox id={item.id} className="mt-1" checked={item.done} disabled={action.isPending} onCheckedChange={checked => action.mutate({ actionId: item.id, done: checked === true })} /><label htmlFor={item.id} className="min-w-0 flex-1 cursor-pointer break-words"><span className={item.done ? "text-muted-foreground line-through" : ""}>{item.task}</span>{item.timeframe && <p className="mt-1 text-xs text-muted-foreground">{item.timeframe}</p>}{item.sourceQuote && <blockquote className="mt-2 border-l-2 pl-3 text-sm text-muted-foreground">“{item.sourceQuote}”</blockquote>}</label></div><div className="mt-2 ml-7 print-hidden"><Button variant="outline" size="sm" disabled={breakdownMutation.isPending} onClick={() => breakdownMutation.mutate(item.id)}><ListTree />{breakdownMutation.isPending && breakdownMutation.variables === item.id ? "Splitting into steps…" : "Break into small steps"}</Button></div><SuggestedSteps parent={item} steps={childrenOf(item.id)} onChanged={refresh} setNotice={setNotice} /></li>)}</ul> : <p className="text-sm text-muted-foreground">No action items agreed in these notes.</p>}</section>
        <section><h2 className="mb-3 text-lg font-semibold">Next steps</h2>{nextSteps.length ? <ol className="list-decimal space-y-2 pl-5 text-sm">{nextSteps.map(item => <li key={item.id} className="break-words">{item.task}{item.timeframe && <span className="text-muted-foreground"> — {item.timeframe}</span>}</li>)}</ol> : <p className="text-sm">No next steps recorded in your notes.</p>}</section>
        <section><h2 className="mb-3 text-lg font-semibold">Suggested follow-up</h2><p className="whitespace-pre-wrap break-words text-sm">{summary.suggested_followup_topic || "No follow-up topic recorded in your notes."}</p></section>
      </div>}
    </>}
  </div>;
}
