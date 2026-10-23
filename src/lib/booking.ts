export const CALL_DURATION_MINUTES = 30;
export const NOTE_LIMIT = 500;
export type CallBooking = {
  id: string;
  mentorId: string;
  mentorName: string;
  company: string | null;
  city: string | null;
  conversationId: string | null;
  problemSummary: string;
  note: string;
  status: "upcoming" | "completed";
  startTime: string;
};
export type DemoSlot = { id: string; startTime: string };
export function demoAvailabilityWindow(now = Date.now()) {
  const istOffset = 330 * 60_000;
  const local = new Date(now + istOffset);
  const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - istOffset;
  return { start, end: start + 7 * 24 * 60 * 60_000 };
}
export function availableDemoSlots(slots: DemoSlot[], now = Date.now()) {
  const { end } = demoAvailabilityWindow(now);
  return slots.filter(slot => {
    const start = Date.parse(slot.startTime);
    return start > now && start < end;
  });
}
export function dayIST(value: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "short" }).format(new Date(value));
}
export function timeIST(value: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(value));
}
export function isPastCall(call: CallBooking, now = Date.now()) {
  return call.status === "completed" || new Date(call.startTime).getTime() + CALL_DURATION_MINUTES * 60_000 <= now;
}
export function googleCalendarUrl(call: CallBooking) {
  const start = new Date(call.startTime);
  const end = new Date(start.getTime() + CALL_DURATION_MINUTES * 60_000);
  const compact = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({ action: "TEMPLATE", text: `Mentor Connect — ${call.mentorName}`, dates: `${compact(start)}/${compact(end)}`, ctz: "Asia/Kolkata", details: `Your goal: ${call.problemSummary}\nDiscussion note: ${call.note}\nDemo booking only. Meeting link is a placeholder.`, location: "Placeholder meeting link — not a live call" });
  return `https://calendar.google.com/calendar/render?${params}`;
}