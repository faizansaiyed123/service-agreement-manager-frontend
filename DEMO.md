# Service Agreement Manager — Recruiter Demo

This branch is the **demo-only** build of Service Agreement Manager.

## Demo behavior

The demo is intentionally self-contained and does **not require the production backend, PostgreSQL, Redis, Stripe, SMTP, SMS, object storage, or any other external service**.

The frontend API layer is routed to `src/lib/demo/runtime.ts`, which provides:

- deterministic seeded company, customers, contacts and service locations
- agreements and agreement lifecycle actions
- work orders and status progression
- invoices, balances and payment simulation
- equipment and service catalog
- branches and technicians
- reports and receivables
- customer, agreement and invoice portal data
- CSV/PDF-style download simulation
- in-memory mutations during the browser session

Refreshing the page resets the demo dataset to its known starting state.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL shown by the terminal. The demo does not need `VITE_API_URL`.

Use any credentials on the login screen. Demo authentication is deterministic and does not send email or contact a real authentication service.

## Architecture

```
Browser UI
   ↓
existing production React pages
   ↓
existing endpoint contract
   ↓
demo API adapter
   ↓
in-browser deterministic state
```

The production API implementation remains present in the branch, but the demo adapter is selected explicitly by `DEMO_MODE = true`. The `main` branch is not changed by this demo work.

## Scope

This branch exists only to provide a realistic, interactive recruiter demonstration of the existing product. It is not intended to replace or weaken the production application.
