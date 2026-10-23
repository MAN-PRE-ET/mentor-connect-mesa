import { describe, expect, it } from "vitest";
import { availableDemoSlots, demoAvailabilityWindow, dayIST, timeIST, googleCalendarUrl, isPastCall, type CallBooking } from "../lib/booking";
const call: CallBooking = { id: "booking", mentorId: "M001", mentorName: "Mentor 001", company: null, city: null, conversationId: "conversation", problemSummary: "Move into product", note: "Discuss an analytics project", status: "upcoming", startTime: "2026-10-26T05:30:00Z" };
describe("demo call rules", () => {
  it("covers today plus six days in IST, including across UTC midnight", () => {
    const window = demoAvailabilityWindow(Date.parse("2026-10-23T20:00:00Z"));
    expect(new Date(window.start).toISOString()).toBe("2026-10-23T18:30:00.000Z");
    expect(new Date(window.end).toISOString()).toBe("2026-10-30T18:30:00.000Z");
  });
  it("never offers past or already-starting slots", () => {
    const now = Date.parse("2026-10-23T09:30:00Z");
    const slots = ["2026-10-23T05:30:00Z", "2026-10-23T09:30:00Z", "2026-10-23T12:30:00Z"].map((startTime, id) => ({ id: String(id), startTime }));
    expect(availableDemoSlots(slots, now).map(slot => slot.id)).toEqual(["2"]);
  });
  it("hides slots outside the rolling seven-day window", () => {
    const slots = ["2026-10-29T12:30:00Z", "2026-10-30T05:30:00Z"].map((startTime, id) => ({ id: String(id), startTime }));
    expect(availableDemoSlots(slots, Date.parse("2026-10-23T08:41:00Z")).map(slot => slot.id)).toEqual(["0"]);
  });
  it("shows 11:00 UTC+5:30 availability in IST", () => { expect(timeIST(call.startTime)).toBe("11:00 am"); expect(dayIST(call.startTime)).toBe("Monday, 26 Oct"); });
  it("moves manually completed calls into past immediately", () => { expect(isPastCall({ ...call, status: "completed" }, Date.parse("2026-10-23T00:00Z"))).toBe(true); expect(isPastCall(call, Date.parse("2026-10-23T00:00Z"))).toBe(false); });
  it("moves elapsed calls into past after their 30-minute duration", () => { expect(isPastCall(call, Date.parse("2026-10-26T05:59:59Z"))).toBe(false); expect(isPastCall(call, Date.parse("2026-10-26T06:00:00Z"))).toBe(true); });
  it("builds Google Calendar without OAuth using the saved goal and edited note", () => { const url = new URL(googleCalendarUrl(call)); expect(url.origin).toBe("https://calendar.google.com"); expect(url.searchParams.get("action")).toBe("TEMPLATE"); expect(url.searchParams.get("dates")).toBe("20261026T053000Z/20261026T060000Z"); expect(url.searchParams.get("ctz")).toBe("Asia/Kolkata"); expect(url.searchParams.get("details")).toContain(call.problemSummary); expect(url.searchParams.get("details")).toContain(call.note); });
});