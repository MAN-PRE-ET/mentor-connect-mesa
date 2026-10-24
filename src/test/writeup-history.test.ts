import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";
import { sameGoalOpenActions } from "../lib/writeup-history.server";
import type { WriteupContext } from "../lib/writeup";

describe("earlier same-goal open actions", () => {
  it("restricts history to this student and goal, earlier completed saved calls, and unfinished validated actions", async () => {
    const calls = { select: vi.fn(), eq: vi.fn(), neq: vi.fn(), lt: vi.fn(), not: vi.fn() };
    for (const method of [calls.select, calls.eq, calls.neq, calls.lt]) method.mockReturnValue(calls);
    calls.not.mockResolvedValue({ data: [{ id: "earlier-same-goal" }], error: null });
    const actions = { select: vi.fn(), in: vi.fn(), eq: vi.fn() };
    actions.select.mockReturnValue(actions); actions.eq.mockReturnValue(actions);
    actions.in.mockReturnValueOnce(actions).mockResolvedValueOnce({ data: [{ task: "Revise case study", timeframe: null }], error: null });
    const from = vi.fn().mockReturnValueOnce(calls).mockReturnValueOnce(actions);
    const db = { from } as unknown as SupabaseClient<Database>;
    const context = { call: { id: "current-call", conversationId: "case-study-goal", startTime: "2026-10-24T05:00:00Z" } } as WriteupContext;
    expect(await sameGoalOpenActions(db, "student-a", context)).toEqual([{ task: "Revise case study", timeframe: null }]);
    expect(calls.eq).toHaveBeenCalledWith("student_id", "student-a");
    expect(calls.eq).toHaveBeenCalledWith("conversation_id", "case-study-goal");
    expect(calls.eq).toHaveBeenCalledWith("status", "completed");
    expect(calls.lt).toHaveBeenCalledWith("slots.start_time", "2026-10-24T05:00:00Z");
    expect(calls.not).toHaveBeenCalledWith("call_notes.summary", "is", null);
    expect(actions.in).toHaveBeenCalledWith("booking_id", ["earlier-same-goal"]);
    expect(actions.eq).toHaveBeenCalledWith("done", false);
    expect(actions.in).toHaveBeenCalledWith("kind", ["call", "accepted"]);
  });
  it("never uses unrelated history when the booking has no goal", async () => {
    const from = vi.fn();
    expect(await sameGoalOpenActions({ from } as unknown as SupabaseClient<Database>, "student-a", { call: { conversationId: null } } as WriteupContext)).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});