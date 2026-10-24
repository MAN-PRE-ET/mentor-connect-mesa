import { describe, expect, it } from "vitest";
import { combineRecap, emptyRecap, orderedActionItems, orderedWorkingSteps, quoteFound, validateSteps, validateSummary, type CallSummary } from "../lib/writeup";

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
  it("retains every separately quoted mentor suggestion and student commitment, dropping unquoted tasks", () => {
    const allNotes = "The mentor suggested choosing a product and writing a problem statement. The mentor also suggested outlining the sections and getting feedback. I committed to revising the draft by Friday and sending the finished case study next Monday. We discussed how these tasks relate to my portfolio.";
    const tasks = ["choosing a product", "writing a problem statement", "outlining the sections", "getting feedback", "revising the draft by Friday", "sending the finished case study next Monday"];
    const result = validateSummary(allNotes, { ...summary, action_items: [...tasks.map(task => ({ task, source_quote: task, suggested_timeframe: null })), { task: "Take a course", source_quote: "not in notes", suggested_timeframe: null }] });
    expect(result.ok && result.summary.action_items.map(item => item.task)).toEqual(tasks);
  });
  it("orders next steps only from actions by deadline, keeping undated tasks last", () => {
    const tasks = [{ task: "Get feedback", timeframe: "next Monday" }, { task: "Choose a product", timeframe: null }, { task: "Outline sections", timeframe: "by Friday" }, { task: "Write problem statement", timeframe: "tomorrow" }];
    expect(orderedActionItems(tasks, "2026-10-21T05:30:00Z").map(item => item.task)).toEqual(["Write problem statement", "Outline sections", "Get feedback", "Choose a product"]);
    expect(tasks[0]?.task).toBe("Get feedback");
  });
});
describe("quick recap capture", () => {
  it("combines only the filled fields with their labels", () => expect(combineRecap({ ...emptyRecap, suggested: "Use a case study", bywhen: "by Friday" })).toBe("What did the mentor suggest? Use a case study\nBy when? by Friday"));
  it("returns an empty string when nothing is filled", () => expect(combineRecap(emptyRecap)).toBe(""));
});
describe("AI-suggested small steps", () => {
  const working = ["Choose the product", "Write the problem statement", "Outline the sections", "Get feedback"];
  it("keeps working steps in their saved start-to-finish sequence, not random id order", () => expect(orderedWorkingSteps([{ task: "Get feedback", stepOrder: 4 }, { task: "Write the problem statement", stepOrder: 2 }, { task: "Choose the product", stepOrder: 1 }, { task: "Outline the sections", stepOrder: 3 }]).map(step => step.task)).toEqual(working));
  it("accepts 3-4 practical trimmed working steps", () => { expect(validateSteps(working.map(step => ` ${step} `))).toEqual(working); expect(validateSteps(working.slice(0, 3))).toEqual(working.slice(0, 3)); });
  it("rejects fewer than 3 or more than 4 steps", () => { expect(validateSteps(working.slice(0, 2))).toBeNull(); expect(validateSteps([...working, "Revise the draft"])).toBeNull(); });
  it.each(["Read https://example.com/guide", "Email mentor@example.com", "Open Figma", "Take a course", "Choose a tool", "Use 50% growth statistics", "Follow what the mentor said", "Ask Alice for feedback"])("rejects forbidden step content: %s", invalid => expect(validateSteps([working[0], working[1], invalid])).toBeNull());
  it("rejects repeated and near-repeated steps", () => { expect(validateSteps(["Write the problem statement", "Write the problem statement!", "Get feedback"])).toBeNull(); expect(validateSteps(["Write the problem statement", "Write a problem statement", "Get feedback"])).toBeNull(); });
  it("rejects non-array input", () => expect(validateSteps("not steps")).toBeNull());
});