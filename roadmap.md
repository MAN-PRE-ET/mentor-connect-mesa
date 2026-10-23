# Roadmap

## Done
- [x] Build Mentor Connect per spec: landing name gate, threaded chat with sidebar, My Calls, About, grounded recommendations with verified evidence chips, support flow, placeholder booking toast.
- [x] Load seed_mentors.sql verbatim: 50 rows confirmed, M001 and M050 exist, RLS read-only SELECT for everyone.
- [x] End-to-end verify: landing → name gate → chat → grounded recommendation with evidence chips, thread list, reload restore, booking toast, mobile drawer, mentors_unavailable error state.
- [x] Reply-text grounding: mentor names in reply text must match validated cards (sentence removal → one re-ask → safe no-mentor fallback).
- [x] No-match replies: one labeled line of general guidance + fitting expertise, no plans/roadmaps.
- [x] UI: numbered avatars, evidence chips first + "+N more" expand, recommendations sorted by evidence count.
- [x] Wording: first name only in first reply, Tele-MANAS only in support card, distinct unknown-mentor vs unknown-detail replies, softened injection refusal.

## Open
- [ ] (Waiting on user) Publish when the user is ready.
