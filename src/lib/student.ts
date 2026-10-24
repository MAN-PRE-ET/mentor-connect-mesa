import { useEffect, useState } from "react";
import type { Student } from "./types";
import { PENDING_KEY_STORAGE, studentKeyStorage, validStudentKey } from "./student-key";

/**
 * Identity in this prototype is a first name, stored in the database and in
 * localStorage. No passwords.
 */

const STUDENT_KEY = "mentor_connect_student";

function readStudent(): Student | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STUDENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Student;
    if (!parsed?.id || !parsed?.firstName) return null;
    if (!validStudentKey(window.localStorage.getItem(studentKeyStorage(parsed.id)))) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStudent(student: Student): void {
  if (typeof window === "undefined") return;
  const pending = window.sessionStorage.getItem(PENDING_KEY_STORAGE);
  if (validStudentKey(pending)) {
    window.localStorage.setItem(studentKeyStorage(student.id), pending);
    window.sessionStorage.removeItem(PENDING_KEY_STORAGE);
  }
  window.localStorage.setItem(STUDENT_KEY, JSON.stringify(student));
}

export function useStudent() {
  const [student, setStudentState] = useState<Student | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const existing = readStudent();
    if (!existing) window.localStorage.removeItem(STUDENT_KEY);
    setStudentState(existing);
    setReady(true);
  }, []);

  const setStudent = (next: Student) => {
    saveStudent(next);
    setStudentState(next);
  };

  return { student, ready, setStudent };
}
