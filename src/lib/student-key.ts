export const STUDENT_KEY_STORAGE = "mentor_connect_student";
export const PENDING_KEY_STORAGE = "mentor_connect_pending_key";
export const studentKeyStorage = (id: string) => `mentor_connect_private_key_${id}`;
export const validStudentKey = (key: unknown): key is string => typeof key === "string" && /^[a-f0-9]{64}$/.test(key);
export function createStudentKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, "0")).join("");
}
export function prepareStudentKey() {
  const key = createStudentKey();
  window.sessionStorage.setItem(PENDING_KEY_STORAGE, key);
}
export function currentStudentKey(): string {
  if (typeof window === "undefined") return "";
  const raw = window.localStorage.getItem(STUDENT_KEY_STORAGE);
  try {
    const student = raw ? JSON.parse(raw) : null;
    const key = student?.id ? window.localStorage.getItem(studentKeyStorage(student.id)) : null;
    if (validStudentKey(key)) return key;
  } catch { /* fail closed */ }
  const pending = window.sessionStorage.getItem(PENDING_KEY_STORAGE);
  return validStudentKey(pending) ? pending : "";
}