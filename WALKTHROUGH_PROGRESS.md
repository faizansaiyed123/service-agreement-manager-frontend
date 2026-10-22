# Walkthrough Progress

**Project:** Service Agreement Manager  
**Target branch:** `main` in both repositories. No task branches are to be created.  
**Canonical public walkthrough:** [`visual.md`](visual.md)  
**Screenshot directory:** [`docs/testing/visuals/`](docs/testing/visuals/)

## Current state

- Work is in progress; do not treat this file as a completion claim.
- Inspected both repositories' `main` trees, the frontend application routes and API client, the backend recovery route, the existing screenshot gallery, Playwright specifications, and GitHub Actions workflows.
- The existing gallery contains genuine browser screenshots for the homepage, dashboard, customer setup, agreements, invoices, assets/catalogue, operations, recurring billing, reports/import, notifications, branch settings, integrations, recovery screens, and payment adjustments.
- Found that the public walkthrough is currently framed as a test report and contains obsolete `LedgerPulse` / `Sayphora` naming.
- Found the end-to-end workflow only runs on `qa/**` pushes (plus pull requests); main pushes do not run this browser journey today.
- Found recent walkthrough workflow runs failing at the password-reset-token fragment-removal assertion. Backend migrations, backend tests, PostgreSQL concurrency checks and frontend build had already passed in that run.
- Applied a focused frontend correction on `main`: recovery-token fragment scrubbing now uses React's layout effect so the one-time token is removed from the address bar before paint. This is **not yet verified** by a successful main-branch browser run.

## Verification checkpoints

| Area | Status | Evidence |
|---|---|---|
| Backend CI on `main` | Previously passed | [Run 39539078907](https://github.com/faizansaiyed123/service-agreement-manager-backend/actions/runs/39539078907), source `11c7da39534be59d22a7be147c6fe0c2426a4ae2` |
| Frontend build CI on `main` | Previously passed | [Run 39761646616](https://github.com/faizansaiyed123/service-agreement-manager-frontend/actions/runs/39761646616), source `08cf584380c3ef08c93db63bca6235a004704f65` |
| Browser walkthrough on `main` | Pending | Enable/repair main-triggered run and require a full successful journey |
| Current screenshots | Historical successful evidence exists; refresh pending | `docs/testing/visuals/` |
| `visual.md` | Pending publication | Must be generated/updated only from a successful main-branch walkthrough |
| Hosted production connectivity | Not verified | Existing evidence uses a local production frontend, backend `main`, and disposable PostgreSQL |

## Work log

1. Inspected frontend/backend repository trees and the current walkthrough, templates, screenshot manifest, browser tests, workflow and CI results.
2. Updated `src/pages/PasswordRecovery.tsx` on frontend `main` to use layout effects for reset/verification token scrubbing. Commit: `99cc4747c059888d45096646eaa622a85d84281b`.
3. Remaining: make the E2E workflow run safely on `main`; resolve any failing user journeys and repeat them; publish successful genuine screenshots; create the visitor-focused `visual.md`; update this record with exact passing run and final commits; verify the backend CI status again.

## Completion rule

This record may be marked complete only after the main-branch end-to-end workflow passes, screenshots are produced by that successful run, every image path in `visual.md` is present, and the linked source commit/CI result are current. External providers and the hosted deployment must remain clearly identified as unverified unless separately exercised.
