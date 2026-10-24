import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Check, CalendarClock, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SlotsSkeleton } from "./skeletons";
import { CallDetails } from "./call-details";
import { bookCall, getBookingContext } from "@/lib/booking.functions";
import { availableDemoSlots, demoAvailabilityWindow, dayIST, timeIST, NOTE_LIMIT, type CallBooking } from "@/lib/booking";
import { useStudent } from "@/lib/student";

export function BookingModal({ mentorId, conversationId, open, onOpenChange }: { mentorId: string; conversationId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { student } = useStudent();
  const queryClient = useQueryClient();
  const fetchContext = useServerFn(getBookingContext);
  const confirm = useServerFn(bookCall);
  const [slotId, setSlotId] = useState("");
  const [note, setNote] = useState("");
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<CallBooking | null>(null);
  const [now, setNow] = useState(Date.now);
  const key = ["booking-context", student?.id, conversationId, mentorId];
  const context = useQuery({ queryKey: key, queryFn: () => fetchContext({ data: { studentId: student?.id ?? "", conversationId, mentorId } }), enabled: open && Boolean(student), staleTime: 0, refetchInterval: open && !booking ? 60_000 : false });
  const visibleSlots = availableDemoSlots(context.data?.slots ?? [], now);
  useEffect(() => { if (open) setNow(Date.now()); }, [open]);
  useEffect(() => {
    if (!open || booking) return;
    const current = Date.now();
    const nextBoundary = Math.min(current + 60_000, demoAvailabilityWindow(current).start + 24 * 60 * 60_000, ...availableDemoSlots(context.data?.slots ?? [], current).map(slot => Date.parse(slot.startTime)));
    const timer = window.setTimeout(() => { setNow(Date.now()); void context.refetch(); }, Math.max(1, nextBoundary - current));
    return () => window.clearTimeout(timer);
  }, [open, booking, context.data, now, context.refetch]);
  useEffect(() => { if (context.data && !edited) setNote(context.data.goal.slice(0, NOTE_LIMIT)); }, [context.data, edited]);
  const mutation = useMutation({
    mutationFn: () => confirm({ data: { studentId: student?.id ?? "", conversationId, slotId, note } }),
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-context"] });
      if (result.ok) { setBooking(result.booking); setError(""); }
      else { setError(result.error); setSlotId(""); }
    },
    onError: e => { setError(e.message); queryClient.invalidateQueries({ queryKey: key }); },
  });
  const groups = new Map<string, NonNullable<typeof context.data>["slots"]>();
  for (const slot of visibleSlots) { const day = dayIST(slot.startTime); groups.set(day, [...(groups.get(day) ?? []), slot]); }
  return <Dialog open={open} onOpenChange={value => { if (!mutation.isPending) onOpenChange(value); }}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-lg">
      <DialogHeader><DialogTitle className="flex items-center gap-2">{booking ? <CheckCircle2 className="size-5 text-success" /> : <CalendarClock className="size-5 text-primary" />}{booking ? "Your call is booked" : "Book a call"}</DialogTitle><DialogDescription>Demo availability · all times in IST</DialogDescription></DialogHeader>
      {booking ? <><CallDetails call={booking} confirmation /><Button asChild><Link to="/my-calls">View My Calls</Link></Button></> : !student ? <p className="text-sm text-muted-foreground">Start a conversation with your first name to book a call.</p> : context.isPending ? <SlotsSkeleton /> : context.isError ? <div><p role="alert" className="text-sm text-destructive">{context.error.message}</p><Button variant="outline" className="mt-3" onClick={() => context.refetch()}>Try again</Button></div> : <>
        <div><p className="font-semibold">{context.data.mentor.name}</p><p className="text-sm text-muted-foreground">{[context.data.mentor.company, context.data.mentor.city].filter(Boolean).join(" · ")}</p></div>
        {groups.size ? <div className="space-y-4">{[...groups].map(([day, slots]) => <fieldset key={day}><legend className="mb-2 text-sm font-medium">{day}</legend><div className="flex flex-wrap gap-2">{slots.map(slot => { const selected = slot.id === slotId; return <Button key={slot.id} variant={selected ? "default" : "outline"} size="sm" className={`min-h-11 min-w-24 gap-1.5 rounded-full ${selected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}`} aria-pressed={selected} onClick={() => { setSlotId(slot.id); setError(""); }}>{selected && <Check className="size-4" aria-hidden />}{timeIST(slot.startTime)}</Button>; })}</div></fieldset>)}</div> : <p className="py-4 text-sm text-muted-foreground">No demo slots are available for this mentor. Please try another mentor.</p>}
        <div><p className="text-xs font-medium text-muted-foreground">Your goal</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{context.data.goal}</p></div>
        <div><label htmlFor="booking-note" className="text-sm font-medium">What do you want to discuss? <span className="font-normal text-muted-foreground">(optional)</span></label><Textarea id="booking-note" className="mt-2 min-h-24" maxLength={NOTE_LIMIT} value={note} onChange={event => { setEdited(true); setNote(event.target.value); }} /><p className="mt-1 text-right text-xs text-muted-foreground">{note.length}/{NOTE_LIMIT}</p></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={!slotId || mutation.isPending || !visibleSlots.some(s => s.id === slotId)} onClick={() => mutation.mutate()}>{mutation.isPending ? "Booking…" : "Confirm booking"}</Button>
      </>}
    </DialogContent>
  </Dialog>;
}