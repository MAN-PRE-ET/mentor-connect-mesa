import { beforeEach, describe, expect, it } from "vitest";
import { currentStudentKey, prepareStudentKey, studentKeyStorage, validStudentKey, STUDENT_KEY_STORAGE } from "../lib/student-key";
import { saveStudent } from "../lib/student";

describe("private per-student browser keys", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it("has no capability for a legacy student without a key", () => {
    localStorage.setItem(STUDENT_KEY_STORAGE, JSON.stringify({ id: "old", firstName: "Old" }));
    expect(currentStudentKey()).toBe("");
  });
  it("creates a 256-bit capability and saves it for the new student", () => {
    prepareStudentKey();
    const pending = currentStudentKey();
    expect(validStudentKey(pending)).toBe(true);
    expect(pending.length).toBe(64);
    saveStudent({ id: "new", firstName: "New" });
    expect(localStorage.getItem(studentKeyStorage("new"))).toBe(pending);
    expect(currentStudentKey()).toBe(pending);
  });
  it("never reuses the previous student's capability for a new identity", () => {
    prepareStudentKey(); saveStudent({ id: "one", firstName: "One" });
    const first = currentStudentKey();
    localStorage.removeItem(STUDENT_KEY_STORAGE);
    prepareStudentKey(); saveStudent({ id: "two", firstName: "Two" });
    expect(currentStudentKey()).not.toBe(first);
  });
  it("rejects malformed keys", () => { expect(validStudentKey("short")).toBe(false); expect(validStudentKey("g".repeat(64))).toBe(false); });
});