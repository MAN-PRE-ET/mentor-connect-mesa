import { z } from "zod";
import type { CallBooking } from "./booking";

export const summarySchema = z.object({
  discussed: z.array(z.object({ point: z.string(), source_quote: z.string() }).strict()),
  action_items: z.array(z.object({ task: z.string(), source_quote: z.string(), suggested_timeframe: z.string().nullable() }).strict()),
  next_steps: z.string(),
  suggested_followup_topic: z.string(),
}).strict();
export type CallSummary = z.infer<typeof summarySchema>;
export type SavedAction = { id: string; bookingId: string; task: string; timeframe: string | null; done: boolean };
export type WriteupContext = { call: CallBooking; notes: string; summary: CallSummary | null; actions: SavedAction[]; priorOpenActions: { task: string; timeframe: string | null }[] };
export type ProgressCall = { bookingId: string; mentorName: string; startTime: string; ready: boolean; open: number; done: number };
export type SummaryResult = { ok: true; summary: CallSummary } | { ok: false; needs_more: boolean; message: string };
export const MORE_DETAIL = { ok: false, needs_more: true, message: "Please add a little more detail about what you discussed and agreed to do. Around 40 words and at least two specific points will help us create a faithful write-up." } as const;
export const normalizeQuote = (text: string) => text.toLocaleLowerCase().replace(/\s+/g, " ").trim();
export const notesWordCount = (notes: string) => notes.trim().split(/\s+/).filter(Boolean).length;
export function quoteFound(notes: string, quote: string) {
  const normalized = normalizeQuote(quote);
  return normalized.length > 0 && normalizeQuote(notes).includes(normalized);
}
export function validateSummary(notes: string, summary: CallSummary): SummaryResult {
  if (notesWordCount(notes) < 40) return MORE_DETAIL;
  const discussed = summary.discussed.filter(item => item.point.trim() && quoteFound(notes, item.source_quote));
  const action_items = summary.action_items.filter(item => item.task.trim() && quoteFound(notes, item.source_quote)).map(item => ({ ...item, suggested_timeframe: item.suggested_timeframe && quoteFound(notes, item.suggested_timeframe) ? item.suggested_timeframe : null }));
  if (discussed.length + action_items.length < 2) return MORE_DETAIL;
  // Free-text sections must themselves be verbatim excerpts, not unquoted advice.
  return { ok: true, summary: { discussed, action_items, next_steps: quoteFound(notes, summary.next_steps) ? summary.next_steps : "", suggested_followup_topic: quoteFound(notes, summary.suggested_followup_topic) ? summary.suggested_followup_topic : "" } };
}