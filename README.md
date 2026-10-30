# Inventra

Inventra is a web-based inventory management project for warehouse teams. It provides an inventory dashboard and tools for tracking stock and warehouse transactions, with an AI Inventory Investigator to help explain notable inventory patterns.

The included inventory seed is synthetic demo data. It is not real retailer operational data.

## Live Demo

Open [Inventra](https://136.80.5.76/), register an account, and verify it with the link shown after sign-up. The dashboard's AI Inventory Investigator can load a small synthetic dataset for a new account so reviewers can try the analysis.

| | Address |
| --- | --- |
| Web app | https://136.80.5.76/ |
| API base | https://136.80.5.76/api |
| Health check | https://136.80.5.76/api/health |

The live AI Investigator uses Google Gemini (`gemini-3.5-flash-lite`).

## Technology

| Technology | Purpose |
| --- | --- |
| TypeScript, React 19, and Vite 7 | Build a typed, responsive single-page web application with a fast local development server. |
| Tailwind CSS 4 and lucide-react | Style the interface with reusable design tokens and provide consistent icons. |
| JavaScript, Node.js 22, and Express 5 | Implement the backend API in the same JavaScript ecosystem as the frontend. |
| MongoDB and Mongoose 8 | Persist accounts, warehouses, locations, inventory items, and transaction records using document models. |
| Zod 4 | Validate API input and backend environment configuration. |
| OpenAI or Google Gemini API (optional) | Generate natural-language explanations for inventory analysis through the Chat Completions format (Gemini via its OpenAI-compatible endpoint). The backend uses local rule-based analysis when no AI key is configured. |

The AI key is configured only in the backend environment (`AI_PROVIDER`, `AI_API_KEY`, optional `AI_MODEL`); it is not a frontend setting. Existing `OPENAI_API_KEY` / `OPENAI_MODEL` settings keep working. Gemini keys, including a free tier, are created in [Google AI Studio](https://aistudio.google.com/apikey).

## Running Locally

Requires Node.js 22 and a MongoDB database (local `mongod` or MongoDB Atlas).

1. Configure the backend: copy `backend/.env.example` to `backend/.env`, then set `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters.
2. Install dependencies: `npm install` in both `backend/` and `frontend/`.
3. Start both servers from `frontend/` with `npm run dev:full`, or run `npm run dev` in each folder. The API listens on port 4000; Vite proxies `/api` to it (override with `INVENTRA_API_URL`).
4. Open the address Vite prints and sign up. Without SMTP, the verification link is returned with the sign-up response.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Session signing secret, at least 32 characters. |
| `PORT` | No | API port, default `4000`. |
| `FRONTEND_ORIGIN` | No | Allowed browser origin for CORS. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | No | Send verification emails. Leave blank for local testing. |
| `DEMO_EMAIL_VERIFICATION_LINKS` | No | `true` shows the verification link on screen (used by the live demo). |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` | No | AI Investigator provider (`openai` or `gemini`), key, and model. |

Run the backend tests with `npm test` in `backend/`.

## Demo Data

All demo records are synthetic and labeled `synthetic-demo`; they belong only to the account they are added to.

Both options add the same dataset: 2 warehouses, 3 locations, 12 grocery items, and about 30 days of transactions. It includes two items below their reorder points, a burst of outbound shipments in the last day, and an unusually large shipment for the AI Investigator to find.

- **In the app:** on an account with no inventory, choose **Load synthetic demo data** in the AI Investigator panel (`POST /api/ai/demo-data`).
- **From the command line:** after signing up and verifying an account, run `SEED_USER_EMAIL=you@example.com npm run seed:inventory` in `backend/`. Running it again replaces the earlier synthetic items and transactions for that account.

## API Reference

All endpoints are under `/api`. Except for health and the sign-up/sign-in flow, they require the session cookie set by sign-in, and every record is scoped to the signed-in account.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | API and database status (`503` when the database is unreachable). |
| POST | `/auth/signup` | Create an account. |
| POST | `/auth/verify-email` | Verify an account with its one-time token. |
| POST | `/auth/resend-verification` | Send a new verification link. |
| POST | `/auth/signin` | Sign in and set the session cookie. |
| POST | `/auth/signout` | Sign out. |
| GET | `/auth/me` | Current account. |
| GET | `/inventory` | List items (search, category, warehouse, and stock-status filters; pagination). |
| POST | `/inventory` | Create an item. |
| GET | `/inventory/:itemId` | Get one item. |
| PATCH | `/inventory/:itemId` | Update an item's details. |
| DELETE | `/inventory/:itemId` | Remove an item, writing off remaining stock. |
| POST | `/inventory/:itemId/transactions` | Record an inbound, outbound, or adjustment movement. |
| POST | `/inventory/:itemId/transfers` | Transfer stock to another warehouse. |
| GET | `/inventory/transactions` | Movement history (filter by type, pagination). |
| GET | `/inventory/warehouses` | List warehouses. |
| POST | `/inventory/warehouses` | Create a warehouse. |
| GET | `/inventory/warehouses/:warehouseId/locations` | List a warehouse's locations. |
| POST | `/inventory/locations` | Create a location. |
| GET | `/dashboard/summary` | Dashboard totals, alerts, and recent movements. |
| GET | `/dashboard/trend` | Inventory trend over time. |
| GET | `/dashboard/warehouse-utilization` | Capacity used per warehouse. |
| GET | `/dashboard/report` | Value by warehouse and category, 30-day movement counts. |
| POST | `/ai/investigator` | Ask the AI Inventory Investigator a question. |
| POST | `/ai/demo-data` | Add the synthetic demo dataset to an empty account. |

## Inventory Management

- **Items:** add, edit, and remove items. Forms validate SKUs, codes, quantities, prices (up to 2 decimals), and expiry dates before anything is sent. Removing an item that still has stock writes the remaining units off with an `ITEM-REMOVED` adjustment, so totals and history stay accurate.
- **Stock movements:** receive, ship, transfer between warehouses, and adjust counts. Dashboard Quick Actions open the inventory with the chosen movement preselected.
- **History:** Inbound, Outbound, Transfers, Adjustments, and an all-movements view, each paginated.
- **Warehouses and locations:** create warehouses with capacity, see how full each one is, and add storage locations to them.
- **Reports:** inventory value by warehouse and category, the last 30 days of movement, and a CSV export of every item.
- **Settings:** account details, offline cache and sync status for this device, and sign-out.

`GET /api/health` reports whether the database is connected. If MongoDB is unreachable, the API keeps running, retries the connection, and answers with `503` instead of exiting.

## AI Inventory Investigator

Inventra's AI Inventory Investigator is available through the authenticated `POST /api/ai/investigator` API. It reviews current quantities and recent transactions to highlight unusually large stock reductions, repeated outbound activity, outbound spikes, and items at or below their reorder points. Each finding includes its supporting quantities and a practical next step. `POST /api/ai/demo-data` adds a small synthetic dataset to an empty account so reviewers can try the feature.

The feature uses account-scoped inventory data and always has local rule-based analysis available. When an optional OpenAI or Gemini key is configured on the backend, the provider also produces a natural-language explanation in response to a question, and the panel shows which provider answered. If the provider fails or times out, the Investigator falls back to local analysis. The assistant supports investigation and recommendations; staff remain responsible for reviewing signals and recording inventory decisions. AI provider processing is optional and uses a reduced set of the signed-in account's inventory facts.

New accounts can load a small synthetic example from the Investigator panel to try the analysis. The endpoint only adds demo records when the account has no inventory and clearly labels them as synthetic.

## Offline-First Inventory

After inventory has been loaded while online, Inventra caches the app shell and account-scoped inventory snapshots in the browser. Staff can record Receive, Issue, Transfer, and adjustment movements offline; the local stock view updates immediately and marks those movements as pending sync. The sync manager retries when the connection returns, the app is reopened, or its tab regains focus. The API validates each movement, prevents duplicate submissions, and reports conflicts for review.

Offline data is stored in IndexedDB on the current browser and device, so reviewers should open the inventory page online before testing offline behavior. The AI Investigator requires a connection to the backend; offline mode is for inventory operations and cached views.
