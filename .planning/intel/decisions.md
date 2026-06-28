# Intel: Decisions Locked in FINAL Scope Doc

Source: RENAME_EXTENSION_PROJECT_SCOPE_FINAL.md
Ingest date: 2026-06-28

These decisions are marked as resolved in the FINAL doc's Decision Log section. They should be promoted to PROJECT.md Key Decisions with status Accepted.

---

## Decisions to Add / Update in PROJECT.md

Decision: Trevor hosts the Claude Haiku API key.
Rationale: Zero friction for users — install and use immediately. Cost is negligible at target scale (~$0.01/month per active user). This is described as the product's competitive moat.
Status: Accepted (locked in FINAL)
Impact: Eliminates SET-03 (API key input), QUAL-01 (local key storage). Changes threat model to rate-limiting and abuse prevention at the server layer.

Decision: Free tier limit is 5 files/month with auto-reset on the 1st of each calendar month.
Rationale: Aggressive enough to demonstrate value, tight enough to force the upgrade decision quickly.
Status: Accepted (locked in FINAL)

Decision: Limit hit UX is a real-time toast nudge; file stays unrenamed.
Rationale: User sees what they missed, friction is visible, upgrade CTA is immediate.
Status: Accepted (locked in FINAL)

Decision: Rule edits are forward-only — no retroactive renaming.
Rationale: Users own their filesystem. Extension does not go back and change already-renamed files.
Status: Accepted (locked in FINAL)

Decision: Conflicting rules trigger a one-time user choice that is remembered for future matches.
Rationale: Avoids repeated dialogs. Users express preference once, extension respects it going forward.
Status: Accepted (locked in FINAL)

Decision: Scaling API costs are deferred until 10k+ active users.
Rationale: At current Haiku pricing, costs remain negligible well past initial scale. Solving this now adds complexity with no near-term payoff.
Status: Accepted (locked in FINAL)

Decision: Premium tier perks are unlimited renames + no ads + bigger stat numbers. No additional features.
Rationale: Keeps premium differentiation simple. No backend required for premium in v1.
Status: Accepted (locked in FINAL)

Decision: Privacy policy states anonymized patterns are sent to Claude; actual filenames are never stored in logs.
Rationale: Privacy-first positioning reduces user concern about sending filenames to an API. Required for Chrome Web Store.
Status: Accepted (locked in FINAL)

Decision: Quality feedback (thumbs-down) is excluded from MVP.
Rationale: Adds scope. If Claude gets names wrong, users will report it in reviews. Add feedback tracking post-launch if needed.
Status: Accepted (locked in FINAL)
