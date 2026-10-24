import { useEffect, useState } from "react";
import { studentKeyStorage } from "./student-key";

// The same student capability protects notes, chats, calls and progress.
export function useWriteupKey(studentId: string | undefined) {
  const [ownerKey, setOwnerKey] = useState("");
  useEffect(() => {
    if (!studentId) { setOwnerKey(""); return; }
    setOwnerKey(window.localStorage.getItem(studentKeyStorage(studentId)) ?? "");
  }, [studentId]);
  return ownerKey;
}