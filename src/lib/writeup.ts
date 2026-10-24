import { z } from "zod";
import { parseDate } from "chrono-node";
import type { CallBooking } from "./booking";

export const summarySchema = z.object({
  discussed: z.array(z.object({ point: z.string(), source_quote: z.string() }).strict()),
  action_items: z.array(z.object({ task: z.string(), source_quote: z.string(), suggested_timeframe: z.string().nullable() }).strict()),
  next_steps: z.string(),
  suggested_followup_topic: z.string(),
}).strict();
export type CallSummary = z.infer<typeof summarySchema>;
export type ActionKind = "call" | "suggested" | "accepted";
export type SavedAction = { id: string; bookingId: string; task: string; timeframe: string | null; done: boolean; sourceQuote: string | null; kind: ActionKind; parentId: string | null; stepOrder?: number | null };
export type WriteupContext = { call: CallBooking; notes: string; summary: CallSummary | null; actions: SavedAction[]; priorOpenActions: { task: string; timeframe: string | null }[] };
export type ProgressCall = { bookingId: string; mentorName: string; startTime: string; ready: boolean; open: number; done: number };
export type GoalProgress = { conversationId: string | null; title: string | null; goal: string; open: number; done: number; calls: ProgressCall[] };
export type SummaryResult = { ok: true; summary: CallSummary } | { ok: false; needs_more: boolean; message: string };
export type BreakdownResult = { ok: true; steps: SavedAction[] } | { ok: false; message: string };
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

// Next steps are deterministic: never reuse model free text or include suggested children.
export function orderedActionItems<T extends { task: string; timeframe: string | null }>(items: T[], reference: string): T[] {
  const referenceDate = new Date(reference);
  const rank = (item: T) => item.timeframe ? (parseDate(item.timeframe, { instant: referenceDate, timezone: 330 }, { forwardDate: true })?.getTime() ?? Number.MAX_SAFE_INTEGER) : Infinity;
  return [...items].sort((a, b) => rank(a) - rank(b));
}

export function orderedWorkingSteps<T extends { stepOrder?: number | null }>(steps: T[]): T[] {
  return [...steps].sort((a, b) => (a.stepOrder ?? Infinity) - (b.stepOrder ?? Infinity));
}

// AI-suggested working steps for one action item, distinct and free of resources/claims.
export const stepsSchema = z.object({ steps: z.array(z.string()).min(3).max(4) }).strict();
export function validateSteps(steps: unknown): string[] | null {
  if (!Array.isArray(steps)) return null;
  if (steps.some(step => typeof step !== "string" || !step.trim())) return null;
  const clean = steps.map(step => String(step).trim());
  if (clean.length < 3 || clean.length > 4) return null;
  if (clean.some(step => step.length > 300 || /https?:\/\/|www\.|@|\d|%|\b(course|courses|tool|tools|statistics|statistic)\b|\bmentor\b|\b[A-Z][a-z]+\b/.test(step.slice(1)) || /https?:\/\/|www\.|@|\d|%|\b(course|courses|tool|tools|statistics|statistic|mentor)\b/i.test(step))) return null;
  const normalized = clean.map(step => normalizeQuote(step).replace(/[^\p{L}\p{N}\s]/gu, ""));
  if (new Set(normalized).size !== clean.length) return null;
  const words = normalized.map(step => new Set(step.split(/\s+/).filter(word => !["the", "a", "an", "your", "of", "for", "to", "and"].includes(word))));
  if (words.some((set, i) => words.slice(i + 1).some(other => {
    const intersection = [...set].filter(word => other.has(word)).length;
    return intersection / new Set([...set, ...other]).size >= 0.8;
  }))) return null;
  return clean;
}

// Quick recap capture: four short fields combined into one notes string.
export const RECAP_FIELDS = [
  { key: "suggested", label: "What did the mentor suggest?" },
  { key: "first", label: "What will you do first?" },
  { key: "bywhen", label: "By when?" },
  { key: "unsure", label: "Anything you're unsure about?" },
] as const;
export type RecapValues = Record<(typeof RECAP_FIELDS)[number]["key"], string>;
export const emptyRecap: RecapValues = { suggested: "", first: "", bywhen: "", unsure: "" };
export function combineRecap(values: RecapValues): string {
  return RECAP_FIELDS.map(field => {
    const value = values[field.key].trim();
    return value ? `${field.label} ${value}` : "";
  }).filter(Boolean).join("\n");
}
