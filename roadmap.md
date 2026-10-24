# Roadmap

## Done
- [x] Build Mentor Connect per spec: landing name gate, threaded chat with sidebar, My Calls, About, grounded recommendations with verified evidence chips, support flow, placeholder booking toast.
- [x] Load seed_mentors.sql verbatim: 50 rows confirmed, M001 and M050 exist, RLS read-only SELECT for everyone.
- [x] End-to-end verify: landing → name gate → chat → grounded recommendation with evidence chips, thread list, reload restore, booking toast, mobile drawer, mentors_unavailable error state.
- [x] Reply-text grounding: mentor names in reply text must match validated cards (sentence removal → one re-ask → safe no-mentor fallback).
- [x] No-match replies: one labeled line of general guidance + fitting expertise, no plans/roadmaps.
- [x] UI: numbered avatars, evidence chips first + "+N more" expand, recommendations sorted by evidence count.
- [x] Wording: first name only in first reply, Tele-MANAS only in support card, distinct unknown-mentor vs unknown-detail replies, softened injection refusal.
- [x] Add 750 demo slots for all 50 mentors, atomic booking, confirmation, and My Calls; verify real grounded recommendation → booking → reload → completion, taken-slot/overlap blocking, and mobile layout.
- [x] Keep demo availability rolling for seven IST calendar days, automatically top up on app load and availability reads, hide expired times, and verify real booking-dialog reload and zero missing future slots.
- [x] Add private note-grounded write-ups, saved action checklists, printing, and completed-call progress; verify generation, short-note prompt, saved checkboxes, earlier open-action context, mobile fit and privacy restrictions.
- [x] Protect all seven student-data tables with one private per-student browser key; verified two-student read/write isolation, blocked legacy RPC bypasses, public mentors/slots, new private booking and write-up generation, saved checkboxes and reload.
- [x] Write-up capture tabs (Quick recap default + paste notes), per-goal progress bars with call timelines, AI-suggested small steps (accept/edit/delete, labeled, count only once accepted), landing/booking copy fixes, mic dictation, prototype note, and black-on-white printing; verified end-to-end with live AI calls and cleaned up test data.

- [x] Update exhaustive quoted tasks, action-derived ordered next steps, 3–4 distinct working steps with persisted sequence, and canonical outbound links; verified six quoted tasks, deadline order, step order after reload, screen fit, 64 tests and clean build; removed disposable test data.
- [x] Remove the write-up "Invite a friend" button, its WhatsApp share link, helper and test; kept Print / Save as PDF, the prototype note, the calendar link and "Back to conversation"; verified no invite or wa.me markup remains, 63 tests and clean build; removed disposable test data.
- [x] Add the /admin Mesa team page: ADMIN_PASSCODE-gated (verified wrong passcode rejected), aggregate-only KPIs, top categories and mentors charts, supply gaps with no-match share, low-completeness mentors needing attention, footer-only link; stats SQL verified against real data, 66 tests and clean build.
- [x] Theme modes and UI polish: header theme menu (Light/Dark/High contrast/System + Normal/Large text, localStorage, no-flash pre-paint script), high-contrast token theme, WCAG-AA focus rings, reduced-motion support, print stays black-on-white; landing hierarchy + trust note, 44px booking slots with selected state, skeletons for calls/write-up/slots, mentor card hover/focus; verified all themes at 360px with zero overflow on landing, chat, cards, booking, My Calls, About, /admin; test students removed.

## Open
- [ ] (Waiting on user) Publish when the user is ready.
