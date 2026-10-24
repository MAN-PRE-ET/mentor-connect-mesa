import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { WriteupContext } from "./writeup";

// Call only after the current booking's student-key ownership check succeeds.
export async function sameGoalOpenActions(db: SupabaseClient<Database>, studentId: string, current: WriteupContext) {
  if (!current.call.conversationId) return [];
  const earlier = await db.from("bookings")
    .select("id, slots!inner(start_time), call_notes!inner(summary)")
    .eq("student_id", studentId).eq("conversation_id", current.call.conversationId)
    .eq("status", "completed").neq("id", current.call.id)
    .lt("slots.start_time", current.call.startTime).not("call_notes.summary", "is", null);
  if (earlier.error) throw new Error("Earlier actions couldn't be loaded. Please try again.");
  if (!earlier.data.length) return [];
  const actions = await db.from("action_items").select("task, timeframe")
    .in("booking_id", earlier.data.map(call => call.id)).eq("done", false).in("kind", ["call", "accepted"]);
  if (actions.error) throw new Error("Earlier actions couldn't be loaded. Please try again.");
  return actions.data;
}