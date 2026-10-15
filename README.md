# Inventra

Inventra is a warehouse and inventory operations dashboard being developed for the HEB food-retail use case. It is intended to help users follow inventory levels, inbound and outbound activity, warehouse locations, and operational alerts. Food-specific capabilities such as lot and expiration tracking are planned; they are not yet implemented in the current backend.

## Project Status

The current release is an early inventory application foundation:

- The Vite + React dashboard reads its inventory KPIs, movement trend, low-stock alerts, recent transactions and warehouse utilization from the authenticated Express API.
- The Express backend provides account registration, sign-in, email verification, session, inventory, transaction and dashboard endpoints backed by MongoDB.
- The repeatable seed creates explicitly synthetic retail demo data. It is not HEB or Walmart operational data.
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

### Inventory and dashboard API

Every endpoint below requires the HTTP-only session cookie. Records are scoped to the authenticated user's `ownerId`; a user cannot list or mutate another user's inventory by supplying their IDs.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` / `POST` | `/api/inventory/warehouses` | List or create the current user's warehouses. |
| `GET` | `/api/inventory/warehouses/:warehouseId/locations` | List locations only when the warehouse belongs to the current user. |
| `POST` | `/api/inventory/locations` | Create a location under one of the current user's warehouses. |
| `GET` / `POST` | `/api/inventory` | Search/filter/page inventory or create an item. Query filters include `search`, `category`, `warehouseId`, and `stockStatus`. |
| `GET` / `PATCH` | `/api/inventory/:itemId` | Read or update an owned item. SKU, warehouse/location and stock quantity cannot be changed through the metadata update endpoint. |
| `POST` | `/api/inventory/:itemId/transactions` | Record `inbound`, `outbound`, or `adjustment` (`direction: increase|decrease`). Outbound/decrease movements cannot reduce stock below zero. |
| `GET` | `/api/inventory/transactions` | List the current user's movement ledger with optional `type` and `inventoryItemId` filters and pagination. |
| `GET` | `/api/dashboard/summary` | Return SKU/unit totals, low/out-of-stock counts, today's inbound/outbound totals, alerts and recent transactions. |
| `GET` | `/api/dashboard/trend?days=7` | Return database-derived daily stock/inbound/outbound series for 7–90 days. |
| `GET` | `/api/dashboard/warehouse-utilization` | Return used units, capacity and utilization per owned warehouse. |

Inventory models are `InventoryItem`, `Warehouse`, `Location` and `Transaction`. Each has an `ownerId` reference to the existing `User`; item/location/transaction records also reference their parent records. Transactions are append-only through the API. The current implementation uses atomic stock updates and a compensating update if ledger creation fails, so it works on a standalone local MongoDB without requiring replica-set transactions.

Authentication requests are implemented in `frontend/src/utils/AuthApi.ts`; inventory and dashboard requests are in `frontend/src/utils/InventoryApi.ts`. Vite proxies the same-origin `/api/*` requests to Express locally, and Firebase Hosting is configured to rewrite them to Cloud Run in production.

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

## Synthetic Demo Seed

The seed requires an existing verified user. It replaces only that user's synthetic inventory items and transactions, and upserts warehouses/locations with reserved `DEMO-*` codes. Manually entered items, transactions, warehouses/locations with other codes, and all other users' data are left intact. Seed product names and quantities are invented retail examples; they must not be presented as real HEB/Walmart data.

```sh
SEED_USER_EMAIL=your-verified-email@example.com npm --prefix backend run seed:inventory
```

Running the command again produces the same set of demo warehouses, locations, products and movement history without adding duplicates.

## Next Steps

Potential follow-up work includes importing a licensed subset of a public retail-sales dataset with attribution, richer receiving/shipping workflows, expiration alerts and deployment verification. The currently seeded inventory remains synthetic.

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