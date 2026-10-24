import { conversationUrl } from "@/lib/app-url";
import { CalendarPlus, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dayIST, timeIST, googleCalendarUrl, type CallBooking } from "@/lib/booking";

export function CallDetails({ call, confirmation = false }: { call: CallBooking; confirmation?: boolean }) {
  return <div className="space-y-5">
    <div className="flex items-start gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">{Number(call.mentorId.replace(/\D/g, "")) || "M"}</div>
      <div className="min-w-0 flex-1"><h3 className="font-semibold">{call.mentorName}</h3><p className="text-sm text-muted-foreground">{[call.company, call.city].filter(Boolean).join(" · ")}</p></div>
      <Badge variant="secondary">{call.status === "completed" ? "Completed" : "Upcoming"}</Badge>
    </div>
    <div><p className="font-medium">{dayIST(call.startTime)}</p><p className="text-sm text-muted-foreground">{timeIST(call.startTime)} IST · 30 minutes</p></div>
    <div><p className="text-xs font-medium text-muted-foreground">Your goal</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{call.problemSummary}</p></div>
    <div><p className="text-xs font-medium text-muted-foreground">Discussion note</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{call.note || "No note added"}</p></div>
    {confirmation && <>
      <div className="border-t pt-4"><p className="text-xs font-medium text-muted-foreground">Placeholder meeting link · not a live call</p><p className="mt-1 break-all text-sm">https://example.com/mentor-call/{call.id}</p><p className="mt-2 text-xs text-muted-foreground">In the full product, both of you would get an email invite with a real meeting link. This demo doesn't send emails.</p></div>
      <Button variant="outline" asChild><a href={googleCalendarUrl(call)} target="_blank" rel="noopener noreferrer"><CalendarPlus />Add to Google Calendar<ExternalLink /></a></Button>
      <div className="rounded-lg bg-accent p-4 text-accent-foreground"><h4 className="flex items-center gap-2 font-medium"><CheckCircle2 className="size-4" />How to prepare</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm">Your goal: {call.problemSummary}</p><p className="mt-2 text-sm">Bring one concrete example and the questions you’d like to explore.</p></div>
    </>}
    {call.conversationId && <Button variant="link" className="h-auto p-0" asChild><a href={conversationUrl(call.conversationId)}>Back to conversation</a></Button>}
  </div>;
}