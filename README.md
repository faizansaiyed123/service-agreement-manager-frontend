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


## Container deployment

The repository includes a multi-stage `Dockerfile` and Nginx configuration for production static hosting, including an SPA fallback for React Router paths and a `/healthz` health check.

For a same-origin deployment, build without `VITE_API_URL` and configure your HTTPS reverse proxy to route `/api/v1/` to the backend API and all other paths to the frontend container. The production backend Compose file binds the API to host loopback on port 8000. For separate frontend and API origins, build with the public API origin, for example `docker build --build-arg VITE_API_URL=https://api.example.com -t service-agreement-manager-frontend .`, and configure the backend `CORS_ORIGINS` to the exact HTTPS frontend origin.

Example local image smoke test:

```sh
docker build -t service-agreement-manager-frontend .
docker run --rm -p 127.0.0.1:8080:80 service-agreement-manager-frontend
# In another terminal:
curl --fail http://127.0.0.1:8080/healthz
```

Add HTTPS at the reverse proxy or hosting platform; this container serves HTTP internally and should not be exposed directly to the public internet. `VITE_API_URL` is embedded in public JavaScript, so never put credentials or other secrets in it.
