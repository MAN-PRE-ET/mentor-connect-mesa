import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createServerDb } from "./db.server";
import { NOTE_LIMIT, type CallBooking } from "./booking";

const studentSchema = z.object({ studentId: z.string().uuid() });
export const getBookingContext = createServerFn({ method: "POST" })
  .inputValidator(z.object({ studentId: z.string().uuid(), conversationId: z.string().uuid(), mentorId: z.string() }))
  .handler(async ({ data }) => {
    const db = createServerDb();
    const { data: conversation } = await db.from("conversations").select("id").eq("id", data.conversationId).eq("student_id", data.studentId).single();
    if (!conversation) throw new Error("This conversation is unavailable.");
    const [slots, goal, mentor] = await Promise.all([
      db.from("slots").select("id,start_time").eq("mentor_id", data.mentorId).eq("booked", false).gt("start_time", new Date().toISOString()).order("start_time"),
      db.from("messages").select("content").eq("conversation_id", data.conversationId).eq("role", "user").order("created_at").limit(1).single(),
      db.from("mentors").select("id,name,company,city").eq("id", data.mentorId).single(),
    ]);
    if (slots.error || goal.error || mentor.error || !mentor.data) throw new Error("Availability couldn't be loaded. Please try again.");
    return { slots: (slots.data ?? []).map(s => ({ id: s.id, startTime: s.start_time })), goal: goal.data.content, mentor: mentor.data };
  });

export const listBookings = createServerFn({ method: "POST" })
  .inputValidator(studentSchema)
  .handler(async ({ data }): Promise<CallBooking[]> => {
    const { data: rows, error } = await createServerDb().rpc("list_demo_calls", { p_student_id: data.studentId });
    if (error) throw new Error("Your calls couldn't be loaded. Please try again.");
    return (Array.isArray(rows) ? rows : []) as unknown as CallBooking[];
  });

export const bookCall = createServerFn({ method: "POST" })
  .inputValidator(z.object({ studentId: z.string().uuid(), conversationId: z.string().uuid(), slotId: z.string().uuid(), note: z.string().max(NOTE_LIMIT) }))
  .handler(async ({ data }): Promise<{ ok: true; booking: CallBooking } | { ok: false; error: string }> => {
    const db = createServerDb();
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
    const { data: completed, error } = await createServerDb().rpc("complete_demo_call", { p_student_id: data.studentId, p_booking_id: data.bookingId });
    if (error || !completed) throw new Error("This call couldn't be updated. Refresh and try again.");
    return { ok: true };
  });