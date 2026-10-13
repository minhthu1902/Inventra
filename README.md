# Inventra

Inventra is a warehouse and inventory operations dashboard being developed for the HEB food-retail use case. It is intended to help users follow inventory levels, inbound and outbound activity, warehouse locations, and operational alerts. Food-specific capabilities such as lot and expiration tracking are planned; they are not yet implemented in the current backend.

## Project Status

The current release is an early application foundation:

- The Vite + React dashboard is populated with sample data from `frontend/src/utils/dashboardData.ts`.
- The Express backend provides account registration, sign-in, email verification, session, and health-check endpoints backed by MongoDB.
- Product lookup, currency conversion, and AI request utilities exist in the frontend source, but are not yet connected to dashboard workflows. They should be treated as integration scaffolding, not live dashboard features.
- The frontend and backend are designed to run locally together. Deployment targets are Firebase Hosting for the static frontend and Cloud Run for the Express API; deploy only after supplying production database and secret configuration.

## Technology Choices

| Technology | How Inventra uses it | Why it fits |
| --- | --- | --- |
| JavaScript and TypeScript | JavaScript is used for backend modules and API utilities; TypeScript/TSX is used for the React interface. | JavaScript supports the Node.js API and browser `fetch` utilities. TypeScript adds checks for React components and dashboard data shapes. |
| React 19 | Builds the dashboard, shared layout, authentication screens, and reusable UI components. | Component-based UI makes repeated dashboard sections easier to develop and maintain. |
| Vite 7 | Develops and builds the frontend; its dev-server proxy forwards `/api/*` to Express. | Fast local startup and a small static production bundle, suitable for Firebase Hosting. |
| React Router 7 | Defines dashboard, authentication, and email-verification routes. | Client-side navigation gives the single-page React app explicit routes without a server-rendering framework. |
| Tailwind CSS 4 | Styles the dashboard and shared UI with utility classes and project theme tokens. | Keeps styling close to the component markup and supports consistent design tokens. |
| Node.js 22 and Express 5 | Runs the backend HTTP API. | Node.js uses the same JavaScript ecosystem as the frontend; Express provides a small, direct route and middleware layer. |
| MongoDB and Mongoose 8 | Stores user accounts; Mongoose defines and accesses the current user model. | MongoDB provides document storage and Mongoose adds schema validation and model APIs for the Node backend. |
| Zod 4 | Validates backend environment configuration and authentication request bodies. | Shared schema-based validation helps reject malformed input at API boundaries. |
| `fetch` | Sends frontend requests to the backend and contains the third-party API utility requests. | It is built into JavaScript runtimes, so no HTTP client dependency is needed. |
| `lucide-react` | Renders interface icons. | Provides consistent, tree-shakeable icons for dashboard controls and status indicators. |

## APIs and AI

### Inventra backend API

The backend runs on port `4000` by default. In local development, Vite proxies requests under `/api/*` to this server. Firebase Hosting uses a same-origin rewrite to the Cloud Run API in production. Available routes are:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Backend health check. |
| `POST` | `/api/auth/signup` | Creates an account and starts email verification. |
| `POST` | `/api/auth/signin` | Signs in a verified account and sets an HTTP-only session cookie. |
| `POST` | `/api/auth/verify-email` | Verifies an email using a one-time token. |
| `POST` | `/api/auth/resend-verification` | Requests another verification email. |
| `POST` | `/api/auth/signout` | Clears the session cookie. |
| `GET` | `/api/auth/me` | Returns the signed-in user; requires a valid session. |

Authentication requests are implemented in `frontend/src/utils/AuthApi.ts` and call the backend through the same-origin `/api/auth` path. This backend API is active application functionality, but it does not yet provide inventory product, stock, receiving, or shipment data.

### Third-party API utilities

These integrations are present as request wrappers, but no current dashboard component calls them:

| Service | Configured API and purpose | Current status |
| --- | --- | --- |
| UPCItemDB | Trial API at `https://api.upcitemdb.com/prod/trial`; `/lookup?upc=...` for barcode lookup and `/search?s=...` for product-name search. | Utility only; not wired into a product-entry screen. The trial service may be rate-limited. |
| exchangerate.host | `https://api.exchangerate.host/latest` for rates and `/convert` for currency conversion. | Utility only; not wired into supplier or purchasing screens. Availability and access requirements depend on the provider. |
| OpenAI API | Chat Completions endpoint `https://api.openai.com/v1/chat/completions`, configured with model `gpt-4o-mini` for the planned AI Inventory Investigator. | Utility only; not wired into the dashboard interaction. No AI answer is currently generated from live inventory data. |

**OpenAI key security:** the current `OpenAiApi.js` reads `VITE_OPENAI_API_KEY`, which is bundled into browser-side code by Vite if configured. Do not put a production API key in a `VITE_*` variable. Before enabling this integration, proxy OpenAI requests through the backend and keep the secret in a server-only environment variable.

AI-related dashboard insight cards currently render sample content. They do not represent responses generated by the OpenAI API.

## Project Structure

```text
Inventra/
├── backend/
│   ├── src/
│   │   ├── auth/          # Authentication routes, controller, and schemas
│   │   ├── config/        # Environment configuration
│   │   ├── db/            # MongoDB connection
│   │   ├── middleware/    # Authentication, validation, and error handling
│   │   └── models/        # Mongoose models
│   └── tests/             # Node.js test-runner tests
└── frontend/
    ├── src/
    │   ├── pages/         # Dashboard and authentication route pages
    │   ├── components/    # Dashboard, layout, and shared React components
    │   └── utils/         # Auth client and third-party API wrappers
    ├── public/            # Static assets
    ├── index.html         # Vite HTML entry point
    └── vite.config.ts     # Vite, Tailwind, React and API proxy configuration
```

## Run Locally

### Requirements

- Node.js 22 or later
- MongoDB running locally or a MongoDB connection URI

### Setup

From the repository root, install dependencies and create a local backend environment file:

```sh
npm --prefix backend install
npm --prefix frontend install
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters. Do not commit `.env` or put secrets in source code. Configure the optional `SMTP_*` values only if the backend should send real verification emails. Without SMTP in development, sign-up can return a verification URL for local testing.

Start MongoDB separately, then run both application servers from `frontend/`:

```sh
cd frontend
npm run dev:full
```

Open [http://localhost:5173](http://localhost:5173). Vite serves the frontend and proxies `/api/*` to the backend on port `4000`. To run only the frontend, use `npm run dev` from `frontend/` and start the backend separately with `npm --prefix backend run dev` from the repository root.

## Validation

Run frontend checks:

```sh
npm --prefix frontend run lint
npm --prefix frontend run build
```

Run backend tests:

```sh
npm --prefix backend test
```

## Next Steps

The next inventory milestones are to add product, warehouse/location, lot and stock-movement models; expose inventory endpoints; connect dashboard and transaction views to persisted API data; and deploy the frontend and backend to the configured Google Cloud targets.

## Google Cloud Deployment

The deployment setup uses Firebase Hosting for the static Vite build and Cloud Run for the Express API. No project Dockerfile is required: Cloud Run's `--source` deployment uses Google Cloud Buildpacks. Firebase Hosting rewrites `/api/**` to the Cloud Run service so browser authentication requests remain same-origin.

Deployment is configured but not yet published. Before deploying, confirm that the Google Cloud project has billing enabled and Cloud Build, Artifact Registry, Cloud Run, and Firebase Hosting are available. You also need a production MongoDB URI reachable from Cloud Run, a strong JWT secret stored in Secret Manager, and Firebase CLI authentication. Never commit database credentials or a JWT secret.

Create `inventra-mongodb-uri` and `inventra-jwt-secret` in Secret Manager and grant the Cloud Run runtime service account access to them. Then deploy the API from the repository root:

```sh
gcloud config set project wtwr-project-493900
gcloud run deploy inventra-api \
    --source backend \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars NODE_ENV=production,FRONTEND_ORIGIN=https://wtwr-project-493900.web.app \
    --set-secrets MONGODB_URI=inventra-mongodb-uri:latest,JWT_SECRET=inventra-jwt-secret:latest
```

Build and deploy the frontend after the API is ready:

```sh
cd frontend
npm run build
cd ..
npx firebase-tools use wtwr-project-493900
npx firebase-tools deploy --only hosting
```

After deployment, open the Firebase Hosting URL and verify sign-in, sign-out, email verification, protected dashboard access, and `/api/health`. Add the confirmed live URL to this README and the review PR. The dashboard inventory cards currently use sample data; deploying does not make those values live.