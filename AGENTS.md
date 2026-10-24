<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project AGENTS.md

- Mentor recommendations are strictly grounded: every card and "why" chip is validated against the mentors DB row server-side (src/lib/chat-validation.ts); ungrounded output is dropped or downgraded to no_match, which is also logged to unmatched_queries. Never relax this.
- The mentors table is the user's real dataset: never seed, edit, or invent mentor rows; if it is empty, the app must show an error state in chat, not placeholder data.
- Mentor seed SQL is applied verbatim; the seed stores ai_native/built_ai_product/ai_experience as booleans and activities_participated as int — toMentorDto converts booleans to "yes"/"no" strings for evidence matching.
- compactMentor must include the mentor `id` (the model can only cite ids it was shown), and mentorFieldContains accepts snake_case field names from the model and maps them to camelCase DTO keys.
- Students are anonymous: only a first name, stored in localStorage; identity is first-name-only per spec.
- Model calls run only server-side through Lovable AI Gateway (src/lib/chat.server.ts) with a strict structured-output schema; never call the model from the browser.
- Booking uses server-only security-definer RPCs after per-student browser-key ownership verification; row locks and a unique slot protect concurrent bookings without adding account identity.
- Calls use one shared duration for display/calendar and matching SQL overlap protection; demo availability is populated alongside its schema migration and mentor details are joined from the original dataset.
- Rolling availability is topped up through the bounded idempotent ensure_demo_availability RPC on app load and before availability reads; SQL uniqueness preserves booked slots, and server/client window filters exclude expired times without recurring background jobs.
- All student data uses one browser-generated 256-bit key sent by global function middleware; only its hash is stored in students. RLS checks this request header across all owner relationships, old test rows have no key and remain inaccessible, and privileged RPCs verify ownership before loading the service client.
- Write-ups use streamed strict structured output in a separate server-only helper, validate quotes and verbatim free-text sections before saving atomically, and never log notes or raw provider errors; saved write-ups are immutable so action completion is not lost to regeneration.
- The write-up save RPC is service-role-only and dynamically loaded after scoped capability verification and validation; otherwise browser callers could bypass the grounding checks by supplying arbitrary summaries.
- AI-suggested action steps live in action_items with kind='suggested' and parent_id, labeled as AI-suggested; only steps the student accepts (kind='accepted') count toward goal progress, and edit/delete/accept RPCs only ever touch kind='suggested' rows so validated items stay immutable.
- Goal progress is computed by the scoped goal_progress RPC (grouped by conversation, counting kind IN ('call','accepted')); breakdown model calls validate distinct working steps and reject resources/claims before the service-role save RPC stores anything.
- Next steps are derived from original saved action items with chrono-node deadline ordering anchored to the call time, not model free text, so they cannot introduce unquoted tasks.
- Canonical outbound app links are composed in src/lib/app-url.ts and shared by calendar descriptions and conversation returns, so preview origins cannot leak into shares.
- Working steps persist their generation sequence in action_items.step_order and read it only after scoped write-up ownership verification, so random UUID ordering cannot scramble the workflow after reload.
- The /admin dashboard is gated by the ADMIN_PASSCODE server secret (timing-safe check, HMAC-signed cookie) and reads only aggregates through the service-role-only admin_dashboard_stats SQL function; student-table privacy rules are never loosened for it and no student text, names, notes or booking details leave the server.
- Theming is class-based on <html>: .dark and .contrast override the CSS-variable tokens in src/styles.css, src/lib/theme.ts owns storage and resolution (system follows prefers-color-scheme/prefers-contrast), and the root head() injects an inline pre-paint script that must stay in sync with applyTheme to avoid theme flash; text size scales via html[data-text-size="large"].
