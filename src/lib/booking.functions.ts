import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createServerDb } from "./db.server";
import { requireStudent } from "./student-auth.server";
import { demoAvailabilityWindow, NOTE_LIMIT, type CallBooking } from "./booking";

const studentSchema = z.object({ studentId: z.string().uuid() });
export const refreshDemoAvailability = createServerFn({ method: "POST" })
  .handler(async () => {
    const { error } = await createServerDb().rpc("ensure_demo_availability");
    if (error) throw new Error("Availability couldn't be refreshed. Please try again.");
    return { ok: true };
  });
export const getBookingContext = createServerFn({ method: "POST" })
  .inputValidator(z.object({ studentId: z.string().uuid(), conversationId: z.string().uuid(), mentorId: z.string() }))
  .handler(async ({ data }) => {
    const db = await requireStudent(data.studentId);
    const { data: conversation } = await db.from("conversations").select("id").eq("id", data.conversationId).eq("student_id", data.studentId).single();
    if (!conversation) throw new Error("This conversation is unavailable.");
    const { error: refreshError } = await db.rpc("ensure_demo_availability");
    if (refreshError) throw new Error("Availability couldn't be loaded. Please try again.");
    const now = Date.now();
    const { end } = demoAvailabilityWindow(now);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [slots, goal, mentor] = await Promise.all([
      db.from("slots").select("id,start_time").eq("mentor_id", data.mentorId).eq("booked", false).gt("start_time", new Date(now).toISOString()).lt("start_time", new Date(end).toISOString()).order("start_time"),
      supabaseAdmin.rpc("booking_goal", { p_conversation_id: data.conversationId, p_mentor_id: data.mentorId }),
      db.from("mentors").select("id,name,company,city").eq("id", data.mentorId).single(),
    ]);
    if (slots.error || goal.error || !goal.data || mentor.error || !mentor.data) throw new Error("Availability couldn't be loaded. Please try again.");
    return { slots: (slots.data ?? []).map(s => ({ id: s.id, startTime: s.start_time })), goal: goal.data, mentor: mentor.data };
  });

export const listBookings = createServerFn({ method: "POST" })
  .inputValidator(studentSchema)
  .handler(async ({ data }): Promise<CallBooking[]> => {
    await requireStudent(data.studentId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("list_demo_calls", { p_student_id: data.studentId });
    if (error) throw new Error("Your calls couldn't be loaded. Please try again.");
    return (Array.isArray(rows) ? rows : []) as unknown as CallBooking[];
  });

export const bookCall = createServerFn({ method: "POST" })
  .inputValidator(z.object({ studentId: z.string().uuid(), conversationId: z.string().uuid(), slotId: z.string().uuid(), note: z.string().max(NOTE_LIMIT) }))
  .handler(async ({ data }): Promise<{ ok: true; booking: CallBooking } | { ok: false; error: string }> => {
    await requireStudent(data.studentId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: id, error } = await db.rpc("book_demo_call", { p_student_id: data.studentId, p_conversation_id: data.conversationId, p_slot_id: data.slotId, p_note: data.note });
    if (error) {
      if (error.message.includes("slot_taken") || error.code === "23505") return { ok: false, error: "That time was just taken. Please choose another available slot." };
      if (error.message.includes("time_overlap")) return { ok: false, error: "You already have a call at that time. Please choose a different time." };
      return { ok: false, error: "We couldn't book this call. Please try again from your mentor recommendation." };
    }
    const { data: rows, error: readError } = await db.rpc("list_demo_calls", { p_student_id: data.studentId });
    const booking = (Array.isArray(rows) ? rows as unknown as CallBooking[] : []).find(row => row.id === id);
    if (readError || !booking) throw new Error("Your call was booked. Check My Calls for the confirmation.");
    return { ok: true, booking };
  });

export const completeBooking = createServerFn({ method: "POST" })
  .inputValidator(z.object({ studentId: z.string().uuid(), bookingId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireStudent(data.studentId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: completed, error } = await supabaseAdmin.rpc("complete_demo_call", { p_student_id: data.studentId, p_booking_id: data.bookingId });
    if (error || !completed) throw new Error("This call couldn't be updated. Refresh and try again.");
    return { ok: true };
  });