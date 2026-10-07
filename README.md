# Inventra

Inventra is a warehouse and inventory operations dashboard being developed for the HEB food-retail use case. It is intended to help users follow inventory levels, inbound and outbound activity, warehouse locations, and operational alerts. Food-specific capabilities such as lot and expiration tracking are planned; they are not yet implemented in the current backend.

## Project Status

The current release is an early application foundation:

- The Next.js dashboard is populated with sample data from `frontend/utils/dashboardData.ts`.
- The Express backend provides account registration, sign-in, email verification, session, and health-check endpoints backed by MongoDB.
- Product lookup, currency conversion, and AI request utilities exist in the frontend source, but are not yet connected to dashboard workflows. They should be treated as integration scaffolding, not live dashboard features.
- The frontend and backend are designed to run locally together. A remote deployment is not included in this repository setup.

## Technology Choices

| Technology | How Inventra uses it | Why it fits |
| --- | --- | --- |
| JavaScript and TypeScript | JavaScript is used for backend modules and API utilities; TypeScript/TSX is used for the Next.js interface. | JavaScript supports the Node.js API and browser `fetch` utilities. TypeScript adds checks for React components and dashboard data shapes. |
| React 19 | Builds the dashboard, shared layout, authentication screens, and reusable UI components. | Component-based UI makes repeated dashboard sections easier to develop and maintain. |
| Next.js 16 App Router | Serves the frontend routes and proxies `/api/*` requests to the Express server in development. | Provides the React application framework, route structure, and production build tooling already used by this project. |
| Tailwind CSS 4 | Styles the dashboard and shared UI with utility classes and project theme tokens. | Keeps styling close to the component markup and supports consistent design tokens. |
| Node.js 22 and Express 5 | Runs the backend HTTP API. | Node.js uses the same JavaScript ecosystem as the frontend; Express provides a small, direct route and middleware layer. |
| MongoDB and Mongoose 8 | Stores user accounts; Mongoose defines and accesses the current user model. | MongoDB provides document storage and Mongoose adds schema validation and model APIs for the Node backend. |
| Zod 4 | Validates backend environment configuration and authentication request bodies. | Shared schema-based validation helps reject malformed input at API boundaries. |
| `fetch` | Sends frontend requests to the backend and contains the third-party API utility requests. | It is built into JavaScript runtimes, so no HTTP client dependency is needed. |
| `lucide-react` | Renders interface icons. | Provides consistent, tree-shakeable icons for dashboard controls and status indicators. |

## APIs and AI

### Inventra backend API

The backend runs on port `4000` by default. In local development, Next.js rewrites requests under `/api/*` to this server. Available routes are:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Backend health check. |
| `POST` | `/api/auth/signup` | Creates an account and starts email verification. |
| `POST` | `/api/auth/signin` | Signs in a verified account and sets an HTTP-only session cookie. |
| `POST` | `/api/auth/verify-email` | Verifies an email using a one-time token. |
| `POST` | `/api/auth/resend-verification` | Requests another verification email. |
| `POST` | `/api/auth/signout` | Clears the session cookie. |
| `GET` | `/api/auth/me` | Returns the signed-in user; requires a valid session. |

Authentication requests are implemented in `frontend/utils/AuthApi.js` and call the backend through the same-origin `/api/auth` path. This backend API is active application functionality, but it does not yet provide inventory product, stock, receiving, or shipment data.

### Third-party API utilities

These integrations are present as request wrappers, but no current dashboard component calls them:

| Service | Configured API and purpose | Current status |
| --- | --- | --- |
| UPCItemDB | Trial API at `https://api.upcitemdb.com/prod/trial`; `/lookup?upc=...` for barcode lookup and `/search?s=...` for product-name search. | Utility only; not wired into a product-entry screen. The trial service may be rate-limited. |
| exchangerate.host | `https://api.exchangerate.host/latest` for rates and `/convert` for currency conversion. | Utility only; not wired into supplier or purchasing screens. Availability and access requirements depend on the provider. |
| OpenAI API | Chat Completions endpoint `https://api.openai.com/v1/chat/completions`, configured with model `gpt-4o-mini` for the planned AI Inventory Investigator. | Utility only; not wired into the dashboard interaction. No AI answer is currently generated from live inventory data. |

**OpenAI key security:** the current `OpenAiApi.js` reads `NEXT_PUBLIC_OPENAI_API_KEY`, which would expose a key to browser-side code if configured. Do not put a production API key in a `NEXT_PUBLIC_*` variable. Before enabling this integration, proxy OpenAI requests through the backend and keep the secret in a server-only environment variable.

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
    ├── app/               # Next.js App Router pages and global styles
    ├── components/        # Dashboard, layout, and shared React components
    ├── public/            # Static assets
    └── utils/             # Auth client and third-party API wrappers
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

Open [http://localhost:3000](http://localhost:3000). The frontend is served on port `3000`; Next.js proxies `/api/*` to the backend on port `4000`. To run only the frontend, use `npm run dev` from `frontend/` and start the backend separately with `npm --prefix backend run dev` from the repository root.

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

The next inventory milestones are to add product, warehouse/location, lot and stock-movement models; expose inventory endpoints; connect dashboard and transaction views to persisted API data; complete responsive behavior down to 320px; and deploy the frontend for review.