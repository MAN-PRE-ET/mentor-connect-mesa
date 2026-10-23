import { useEffect, useState } from "react";

// An independent capability protects private notes even if a public student UUID leaks.
export function useWriteupKey(studentId: string | undefined) {
  const [ownerKey, setOwnerKey] = useState("");
  useEffect(() => {
    if (!studentId) { setOwnerKey(""); return; }
    const storageKey = `mentor_connect_writeup_key_${studentId}`;
    let key = window.localStorage.getItem(storageKey);
    if (!key || !/^[a-f0-9]{64}$/.test(key)) {
      key = Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, "0")).join("");
      window.localStorage.setItem(storageKey, key);
    }
    setOwnerKey(key);
  }, [studentId]);
  return ownerKey;
}