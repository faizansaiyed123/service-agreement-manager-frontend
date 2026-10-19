# Service Agreement Manager Frontend

Production-oriented React/Vite frontend for the Service Agreement Manager backend.

## Development

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Start the app with `npm run dev`.

For local development, the default API URL is `http://localhost:8000`. For production, leave `VITE_API_URL` unset and use the recommended same-origin HTTPS reverse proxy that forwards `/api/v1` to the API. Vite embeds this value into the client bundle, so never put secrets in frontend environment variables. The production Nginx policy intentionally restricts API connections to the same origin.

## Verification

`npm run build` runs the strict TypeScript build and Vite production bundle. GitHub Actions runs the same build on pushes and pull requests to `main`.

## Backend integration

The frontend uses the real FastAPI endpoints under `/api/v1` with server-set `HttpOnly` access/refresh cookies and automatic cookie-based session refresh. It never reads or stores bearer tokens in JavaScript-accessible storage. Startup also removes the legacy token key left by earlier versions. No mock API layer is used.


## Production deployment checklist

- Prefer a same-origin reverse proxy for `/api/v1`; if using a separate API hostname, update the CSP `connect-src` policy and backend cookie/CORS configuration.
- Serve the app and API only over HTTPS in production.
- Configure the static host to serve `index.html` for client-side routes (SPA fallback).
- Verify the deployed browser can reach the API origin and that the backend `CORS_ORIGINS` contains the exact frontend origin when cross-origin requests are used.
- Run `npm run build` in CI before deploying. This repository currently has no committed npm lockfile; generate and commit `package-lock.json` from a trusted development environment, then switch CI to `npm ci` and restore npm caching for reproducible builds.


## Container deployment

The repository includes a multi-stage `Dockerfile` and Nginx configuration for production static hosting, including an SPA fallback for React Router paths and a `/healthz` health check.

For a same-origin deployment, build without `VITE_API_URL` and configure your HTTPS reverse proxy to route `/api/v1/` to the backend API and all other paths to the frontend container. The production backend Compose file binds the API to host loopback on port 8000. For a separate same-site API hostname, build with the public API origin, for example `docker build --build-arg VITE_API_URL=https://api.example.com -t service-agreement-manager-frontend .`, configure the backend `CORS_ORIGINS` to the exact HTTPS frontend origin, and amend `connect-src` in `nginx.conf` to allow that exact API origin. Same-origin deployment is less error-prone.

Example local image smoke test:

```sh
docker build -t service-agreement-manager-frontend .
docker run --rm -p 127.0.0.1:8080:80 service-agreement-manager-frontend
# In another terminal:
curl --fail http://127.0.0.1:8080/healthz
```

Add HTTPS at the reverse proxy or hosting platform; this container serves HTTP internally and should not be exposed directly to the public internet. `VITE_API_URL` is embedded in public JavaScript, so never put credentials or other secrets in it.
