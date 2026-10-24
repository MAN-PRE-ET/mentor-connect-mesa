import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Publishable client scoped by the request's browser key; RLS checks ownership.
 */
export function createServerDb() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Database unavailable");
  const studentKey = getRequestHeader("X-Student-Key");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        if (studentKey && /^[a-f0-9]{64}$/.test(studentKey)) headers.set("X-Student-Key", studentKey);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
