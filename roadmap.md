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

## Open
- [ ] (Waiting on user) Publish when the user is ready.
