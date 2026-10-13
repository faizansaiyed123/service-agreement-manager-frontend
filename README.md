# Service Agreement Manager Frontend

Production-oriented React/Vite frontend for the Service Agreement Manager backend.

## Development

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Start the app with `npm run dev`.

The default API URL is `http://localhost:8000`; override it with `VITE_API_URL`.

## Verification

`npm run build` runs the strict TypeScript build and Vite production bundle. GitHub Actions runs the same build on pushes and pull requests to `main`.

## Backend integration

The frontend uses the real FastAPI endpoints under `/api/v1`, including bearer access tokens and refresh-token rotation. No mock API layer is used.
