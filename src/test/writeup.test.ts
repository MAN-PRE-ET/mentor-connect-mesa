import { describe, expect, it } from "vitest";
import { quoteFound, validateSummary, type CallSummary } from "../lib/writeup";

const notes = "We discussed my portfolio and the story behind my project. I will revise the case study by Friday. I will send the updated portfolio to the mentor. Next time we will discuss interview practice and review the changes together in detail.";
const summary: CallSummary = { discussed: [{ point: "Portfolio story", source_quote: "my portfolio and the story behind my project" }], action_items: [{ task: "Revise the case study", source_quote: "I will revise the case study by Friday", suggested_timeframe: "by Friday" }], next_steps: "I will send the updated portfolio to the mentor", suggested_followup_topic: "interview practice" };
describe("notes-only write-ups", () => {
  it("matches quotes case-insensitively with whitespace normalized", () => expect(quoteFound(notes, "MY   PORTFOLIO\nand the story")).toBe(true));
  it("rejects empty and invented quotes", () => { expect(quoteFound(notes, "")).toBe(false); expect(quoteFound(notes, "Take a paid course")).toBe(false); });
  it("asks for detail below 40 words", () => expect(validateSummary("We talked about work.", summary)).toMatchObject({ needs_more: true }));
  it("requires at least two surviving items", () => expect(validateSummary(notes, { ...summary, action_items: [{ task: "Invented", suggested_timeframe: null, source_quote: "not in notes" }] })).toMatchObject({ needs_more: true }));
  it("drops unsupported items while retaining verified ones", () => { const result = validateSummary(notes, { ...summary, discussed: [...summary.discussed, { point: "Invented", source_quote: "invented evidence" }] }); expect(result.ok && result.summary.discussed.length).toBe(1); });
  it("clears invented timeframes", () => { const result = validateSummary(notes, { ...summary, action_items: [{ task: "Revise the case study", source_quote: "I will revise the case study by Friday", suggested_timeframe: "tomorrow" }] }); expect(result.ok && result.summary.action_items[0]?.suggested_timeframe).toBeNull(); });
  it("clears ungrounded next steps and follow-up", () => { const result = validateSummary(notes, { ...summary, next_steps: "Read https://invented.test", suggested_followup_topic: "Salary negotiation" }); expect(result.ok && result.summary.next_steps).toBe(""); expect(result.ok && result.summary.suggested_followup_topic).toBe(""); });
  it("retains two grounded items and verbatim free-text sections", () => expect(validateSummary(notes, summary)).toEqual({ ok: true, summary }));
});