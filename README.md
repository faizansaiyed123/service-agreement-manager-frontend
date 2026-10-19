# Service Agreement Manager Frontend

Production-oriented React/Vite frontend for the Service Agreement Manager backend.

## Development

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Start the app with `npm run dev`.

For local development, the default API URL is `http://localhost:8000`. Set `VITE_API_URL` to the public HTTPS origin of your deployed API before building for production. Leave it unset only when your reverse proxy serves the frontend and forwards `/api/v1` to the API on the same origin. Vite embeds this value into the client bundle, so never put secrets in frontend environment variables.

## Verification

`npm run build` runs the strict TypeScript build and Vite production bundle. GitHub Actions runs the same build on pushes and pull requests to `main`.

## Backend integration

The frontend uses the real FastAPI endpoints under `/api/v1`, including bearer access tokens and refresh-token rotation. No mock API layer is used.


## Production deployment checklist

- Configure `VITE_API_URL` at build time, or route `/api/v1` through a same-origin reverse proxy.
- Serve the app and API only over HTTPS in production.
- Configure the static host to serve `index.html` for client-side routes (SPA fallback).
- Verify the deployed browser can reach the API origin and that the backend `CORS_ORIGINS` contains the exact frontend origin when cross-origin requests are used.
- Run `npm run build` in CI before deploying. This repository currently has no committed npm lockfile; generate and commit `package-lock.json` from a trusted development environment, then switch CI to `npm ci` and restore npm caching for reproducible builds.
