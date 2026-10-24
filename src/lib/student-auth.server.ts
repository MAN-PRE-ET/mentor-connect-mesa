import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { createServerDb } from "./db.server";

export function requestStudentKey() {
  const key = getRequestHeader("X-Student-Key");
  if (!key || !/^[a-f0-9]{64}$/.test(key)) throw new Error("student_unavailable");
  return key;
}
export async function requireStudent(studentId: string) {
  requestStudentKey();
  setResponseHeader("Cache-Control", "no-store");
  const db = createServerDb();
  const { data, error } = await db.from("students").select("id").eq("id", studentId).single();
  if (error || !data) throw new Error("student_unavailable");
  return db;
}
export async function requireConversation(conversationId: string) {
  requestStudentKey();
  setResponseHeader("Cache-Control", "no-store");
  const db = createServerDb();
  const { data, error } = await db.from("conversations").select("id,student_id").eq("id", conversationId).single();
  if (error || !data) throw new Error("conversation_not_found");
  return db;
}