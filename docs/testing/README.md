# Walkthrough evidence and verification

The visitor-facing product tour is maintained in the frontend repository root: [`visual.md`](../../visual.md). It presents the Service Agreement Manager user journey with aligned screenshots captured from successful browser interactions.

- [Product walkthrough](../../visual.md) — the public-facing feature tour for visitors, recruiters and interviewers.
- [Screenshot gallery](visuals/) — genuine PNG captures used by the walkthrough.
- [Screenshot manifest](visuals/manifest.json) — source commit, workflow run and image inventory for the latest successful publication.
- [Verification record](TEST-REPORT.md) — browser/backend run counts and the scope boundaries.
- [Browser/API journey](../../e2e/ledgerpulse.spec.cjs) and [extended account/security/finance journey](../../e2e/ledgerpulse-extended.spec.cjs).
- [Main-branch workflow](../../.github/workflows/ledgerpulse-e2e.yml) — starts the backend from its `main` branch, runs the production frontend build against isolated PostgreSQL and publishes screenshots only when the entire browser journey succeeds.
- [Walkthrough progress record](../../WALKTHROUGH_PROGRESS.md) — current completion state and any unverified external dependencies.

External email/SMS delivery, third-party webhook recipients and hosted production connectivity are not claimed based on the isolated walkthrough environment.
