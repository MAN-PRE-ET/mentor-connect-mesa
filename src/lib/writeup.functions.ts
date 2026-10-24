import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { createServerDb } from "./db.server";
import { summarizeNotes } from "./writeup-ai.server";
import { MORE_DETAIL, notesWordCount, type WriteupContext, type ProgressCall, type SummaryResult } from "./writeup";

const identity = z.object({ studentId: z.string().uuid(), ownerKey: z.string().regex(/^[a-f0-9]{64}$/) });
const callInput = identity.extend({ bookingId: z.string().uuid() });
const unavailable = "This write-up is unavailable for this student. Return to My Calls and try again.";
export const getWriteup = createServerFn({ method: "POST" }).inputValidator(callInput).handler(async ({ data }): Promise<WriteupContext> => {
  setResponseHeader("Cache-Control", "no-store");
  const result = await createServerDb().rpc("writeup_context", { p_student_id: data.studentId, p_booking_id: data.bookingId, p_owner_key: data.ownerKey });
  if (result.error || !result.data) throw new Error(unavailable);
  return result.data as unknown as WriteupContext;
});
export const getProgress = createServerFn({ method: "POST" }).inputValidator(identity).handler(async ({ data }): Promise<ProgressCall[]> => {
  setResponseHeader("Cache-Control", "no-store");
  const result = await createServerDb().rpc("writeup_progress", { p_student_id: data.studentId, p_owner_key: data.ownerKey });
  if (result.error) throw new Error("Your progress couldn't be loaded. Please try again.");
  return result.data as unknown as ProgressCall[];
});
export const summarize = createServerFn({ method: "POST" }).inputValidator(callInput.extend({ notes: z.string().max(30000) })).handler(async ({ data }): Promise<SummaryResult> => {
  setResponseHeader("Cache-Control", "no-store");
  const db = createServerDb();
  const context = await db.rpc("writeup_context", { p_student_id: data.studentId, p_booking_id: data.bookingId, p_owner_key: data.ownerKey });
  if (context.error || !context.data) return { ok: false, needs_more: false, message: unavailable };
  const current = context.data as unknown as WriteupContext;
  if (current.summary) return { ok: true, summary: current.summary };
  if (notesWordCount(data.notes) < 40) return MORE_DETAIL;
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, needs_more: false, message: "The write-up service isn't configured yet. Your notes are still here." };
  const result = await summarizeNotes(apiKey, data.notes, current.priorOpenActions);
  if (!result.ok) return result;
  // Privileged persistence is allowed only after the scoped owner check above and grounding validation.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const saved = await supabaseAdmin.rpc("save_call_writeup", { p_student_id: data.studentId, p_booking_id: data.bookingId, p_owner_key: data.ownerKey, p_notes: data.notes, p_summary: JSON.parse(JSON.stringify(result.summary)) });
  if (saved.error) return { ok: false, needs_more: false, message: "Your write-up couldn't be saved. Your notes are still here; please try again." };
  return result;
});
export const setActionDone = createServerFn({ method: "POST" }).inputValidator(identity.extend({ actionId: z.string().uuid(), done: z.boolean() })).handler(async ({ data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const result = await createServerDb().rpc("set_writeup_action", { p_student_id: data.studentId, p_action_id: data.actionId, p_owner_key: data.ownerKey, p_done: data.done });
  if (result.error || !result.data) throw new Error("This action couldn't be saved. Please try again.");
  return { ok: true };
});