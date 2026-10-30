# Inventra

Inventra is a web-based inventory management project for warehouse teams. It provides an inventory dashboard and tools for tracking stock and warehouse transactions, with an AI Inventory Investigator to help explain notable inventory patterns.

The included inventory seed is synthetic demo data. It is not real retailer operational data.

## Live Demo

Open [Inventra](https://136.80.5.76/), register an account, and verify it with the link shown after sign-up. The dashboard's AI Inventory Investigator can load a small synthetic dataset for a new account so reviewers can try the analysis.

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
