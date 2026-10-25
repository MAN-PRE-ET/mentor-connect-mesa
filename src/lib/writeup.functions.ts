import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireStudent, requestStudentKey } from "./student-auth.server";
import { breakdownAction, summarizeNotes } from "./writeup-ai.server";
import { sameGoalOpenActions } from "./writeup-history.server";
import {
  MIN_NOTES_WORDS,
  MORE_DETAIL,
  notesWordCount,
  type BreakdownResult,
  type GoalProgress,
  type ProgressCall,
  type SavedAction,
  type SummaryResult,
  type WriteupContext,
} from "./writeup";
import { getAiApiKey } from "./ai-gateway.server";

const identity = z.object({ studentId: z.string().uuid(), ownerKey: z.string().regex(/^[a-f0-9]{64}$/) });
const callInput = identity.extend({ bookingId: z.string().uuid() });
const unavailable = "This write-up is unavailable for this student. Return to My Calls and try again.";
export const getWriteup = createServerFn({ method: "POST" })
  .inputValidator(callInput)
  .handler(async ({ data }): Promise<WriteupContext> => {
    setResponseHeader("Cache-Control", "no-store");
    await requireStudent(data.studentId);
    if (requestStudentKey() !== data.ownerKey) throw new Error(unavailable);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.rpc("writeup_context", {
      p_student_id: data.studentId,
      p_booking_id: data.bookingId,
      p_owner_key: data.ownerKey,
    });
    if (result.error || !result.data) throw new Error(unavailable);
    const context = result.data as unknown as WriteupContext;
    const order = await supabaseAdmin.from("action_items").select("id, step_order").eq("booking_id", data.bookingId);
    if (order.error) throw new Error(unavailable);
    const positions = new Map(order.data.map((item) => [item.id, item.step_order]));
    return {
      ...context,
      priorOpenActions: await sameGoalOpenActions(supabaseAdmin, data.studentId, context),
      actions: context.actions.map((item) => ({ ...item, stepOrder: positions.get(item.id) ?? null })),
    };
  });
export const getProgress = createServerFn({ method: "POST" })
  .inputValidator(identity)
  .handler(async ({ data }): Promise<ProgressCall[]> => {
    setResponseHeader("Cache-Control", "no-store");
    await requireStudent(data.studentId);
    if (requestStudentKey() !== data.ownerKey) throw new Error(unavailable);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.rpc("writeup_progress", {
      p_student_id: data.studentId,
      p_owner_key: data.ownerKey,
    });
    if (result.error) throw new Error("Your progress couldn't be loaded. Please try again.");
    return result.data as unknown as ProgressCall[];
  });
export const getGoalProgress = createServerFn({ method: "POST" })
  .inputValidator(identity)
  .handler(async ({ data }): Promise<GoalProgress[]> => {
    setResponseHeader("Cache-Control", "no-store");
    await requireStudent(data.studentId);
    if (requestStudentKey() !== data.ownerKey) throw new Error(unavailable);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.rpc("goal_progress", {
      p_student_id: data.studentId,
      p_owner_key: data.ownerKey,
    });
    if (result.error) throw new Error("Your progress couldn't be loaded. Please try again.");
    return result.data as unknown as GoalProgress[];
  });
export const summarize = createServerFn({ method: "POST" })
  .inputValidator(callInput.extend({ notes: z.string().max(30000) }))
  .handler(async ({ data }): Promise<SummaryResult> => {
    setResponseHeader("Cache-Control", "no-store");
    await requireStudent(data.studentId);
    if (requestStudentKey() !== data.ownerKey) return { ok: false, needs_more: false, message: unavailable };
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const context = await db.rpc("writeup_context", {
      p_student_id: data.studentId,
      p_booking_id: data.bookingId,
      p_owner_key: data.ownerKey,
    });
    if (context.error || !context.data) return { ok: false, needs_more: false, message: unavailable };
    const current = context.data as unknown as WriteupContext;
    if (current.summary) return { ok: true, summary: current.summary };
    if (notesWordCount(data.notes) < MIN_NOTES_WORDS) return MORE_DETAIL;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey)
      return {
        ok: false,
        needs_more: false,
        message: "The write-up service isn't configured yet. Your notes are still here.",
      };
    const priorOpenActions = await sameGoalOpenActions(db, data.studentId, current);
    const result = await summarizeNotes(apiKey, data.notes, priorOpenActions);
    if (!result.ok) return result;
    // Privileged persistence is allowed only after the scoped owner check above and grounding validation.
    const saved = await db.rpc("save_call_writeup", {
      p_student_id: data.studentId,
      p_booking_id: data.bookingId,
      p_owner_key: data.ownerKey,
      p_notes: data.notes,
      p_summary: JSON.parse(JSON.stringify(result.summary)),
    });
    if (saved.error)
      return {
        ok: false,
        needs_more: false,
        message: "Your write-up couldn't be saved. Your notes are still here; please try again.",
      };
    return result;
  });
export const setActionDone = createServerFn({ method: "POST" })
  .inputValidator(identity.extend({ actionId: z.string().uuid(), done: z.boolean() }))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    await requireStudent(data.studentId);
    if (requestStudentKey() !== data.ownerKey) throw new Error(unavailable);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.rpc("set_writeup_action", {
      p_student_id: data.studentId,
      p_action_id: data.actionId,
      p_owner_key: data.ownerKey,
      p_done: data.done,
    });
    if (result.error || !result.data) throw new Error("This action couldn't be saved. Please try again.");
    return { ok: true };
  });
export const breakdown = createServerFn({ method: "POST" })
  .inputValidator(identity.extend({ actionId: z.string().uuid() }))
  .handler(async ({ data }): Promise<BreakdownResult> => {
    setResponseHeader("Cache-Control", "no-store");
    await requireStudent(data.studentId);
    if (requestStudentKey() !== data.ownerKey) return { ok: false, message: unavailable };
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const item = await db.rpc("action_for_breakdown", {
      p_student_id: data.studentId,
      p_action_id: data.actionId,
      p_owner_key: data.ownerKey,
    });
    if (item.error || !item.data) return { ok: false, message: unavailable };
    const target = item.data as { task: string; timeframe: string | null };
    // The RPC above verifies ownership before any related action rows are read.
    const parent = await db.from("action_items").select("booking_id").eq("id", data.actionId).single();
    if (parent.error || !parent.data) return { ok: false, message: unavailable };
    const siblings = await db
      .from("action_items")
      .select("task")
      .eq("booking_id", parent.data.booking_id)
      .is("parent_id", null)
      .neq("id", data.actionId);
    if (siblings.error) return { ok: false, message: unavailable };
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, message: "The write-up service isn't configured yet." };
    const steps = await breakdownAction(
      apiKey,
      target.task,
      target.timeframe,
      siblings.data.map((other) => other.task),
    );
    if (!steps) return { ok: false, message: "We couldn't split this into small steps. Please try again." };
    // Persistence only after the scoped owner check and step validation above.
    const saved = await db.rpc("save_suggested_steps", {
      p_student_id: data.studentId,
      p_parent_id: data.actionId,
      p_owner_key: data.ownerKey,
      p_steps: steps,
    });
    if (saved.error || !saved.data)
      return { ok: false, message: "The suggested steps couldn't be saved. Please try again." };
    return { ok: true, steps: saved.data as unknown as SavedAction[] };
  });
export const manageStep = createServerFn({ method: "POST" })
  .inputValidator(
    identity.extend({
      actionId: z.string().uuid(),
      action: z.enum(["accept", "edit", "delete"]),
      task: z.string().max(300).optional(),
    }),
  )
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    await requireStudent(data.studentId);
    if (requestStudentKey() !== data.ownerKey) throw new Error(unavailable);
    const task = data.task?.trim() ?? "";
    if (data.action === "edit" && !task) throw new Error("The step can't be empty.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.rpc("manage_suggested_step", {
      p_student_id: data.studentId,
      p_action_id: data.actionId,
      p_owner_key: data.ownerKey,
      p_action: data.action,
      p_task: task,
    });
    if (result.error || !result.data) throw new Error("That step couldn't be updated. Please try again.");
    return { ok: true };
  });
