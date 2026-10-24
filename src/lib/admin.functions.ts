import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const COOKIE_NAME = "admin-gate";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type AdminDashboard = {
  students: number;
  chats: number;
  bookings: number;
  writeups: number;
  completedCalls: number;
  chatsWithRecommendations: number;
  topCategories: { category: string; count: number }[];
  topMentors: { id: string; name: string; count: number }[];
  unmatchedByCategory: { category: string; count: number }[];
  unmatchedChats: number;
  needsAttention: { id: string; name: string; count: number }[];
};

async function adminToken(passcode: string): Promise<string> {
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", passcode).update("mentor-connect-admin").digest("hex");
}

async function tokensMatch(a: string, b: string): Promise<boolean> {
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Server-only gate: the passcode lives in the ADMIN_PASSCODE env var and is
 * compared with a timing-safe check. The unlocked state is an HMAC-signed
 * cookie derived from the passcode; rotating the passcode invalidates it.
 */
async function requireAdmin(): Promise<void> {
  const expected = process.env["ADMIN_PASSCODE"];
  if (!expected) throw new Error("Admin access is not configured.");
  const cookies = getRequestHeader("cookie") ?? "";
  const match = cookies.split(/;\s*/).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = match?.slice(COOKIE_NAME.length + 1) ?? "";
  const valid = token !== "" && (await tokensMatch(token, await adminToken(expected)));
  if (!valid) throw new Error("unauthorized");
}

export const verifyAdminPasscode = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ passcode: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSCODE"];
    if (!expected) throw new Error("Admin access is not configured.");
    if (!(await tokensMatch(data.passcode, expected))) return { ok: false as const };
    const token = await adminToken(expected);
    setResponseHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`,
    );
    return { ok: true as const };
  });

export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  );
  return { ok: true as const };
});

/**
 * Returns aggregate counts only — never student names, chat text, notes or
 * booking details. Backed by the service-role-only admin_dashboard_stats SQL
 * function; student tables keep their existing privacy rules.
 */
export const getAdminDashboard = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.rpc("admin_dashboard_stats");
  if (result.error || !result.data) throw new Error("Couldn't load dashboard data.");
  return result.data as unknown as AdminDashboard;
});
