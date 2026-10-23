# Inventra

Inventra is a web-based inventory management project for warehouse teams. It provides an inventory dashboard and tools for tracking stock and warehouse transactions, with an AI Inventory Investigator to help explain notable inventory patterns.

The included inventory seed is synthetic demo data. It is not real HEB, Walmart, or other retailer operational data.

## Live Demo

Open [Inventra](https://35.239.213.104/), register an account, and verify it with the link shown after sign-up. The dashboard's AI Inventory Investigator can load a small synthetic dataset for a new account so reviewers can try the analysis.

## Technology

| Technology | Purpose |
| --- | --- |
| TypeScript, React 19, and Vite 7 | Build a typed, responsive single-page web application with a fast local development server. |
| Tailwind CSS 4 and lucide-react | Style the interface with reusable design tokens and provide consistent icons. |
| JavaScript, Node.js 22, and Express 5 | Implement the backend API in the same JavaScript ecosystem as the frontend. |
| MongoDB and Mongoose 8 | Persist accounts, warehouses, locations, inventory items, and transaction records using document models. |
| Zod 4 | Validate API input and backend environment configuration. |
| OpenAI Chat Completions API (optional) | Generate natural-language explanations for inventory analysis. The backend can use local rule-based analysis when no OpenAI key is configured. |

The OpenAI key is configured only in the backend environment; it is not a frontend setting.

## AI Inventory Investigator

Inventra's AI Inventory Investigator is available through the authenticated `POST /api/ai/investigator` API. It reviews current quantities and recent transactions to highlight unusually large stock reductions, repeated outbound activity, outbound spikes, and items at or below their reorder points. Each finding includes its supporting quantities and a practical next step. `POST /api/ai/demo-data` adds a small synthetic dataset to an empty account so reviewers can try the feature.

The feature uses account-scoped inventory data and always has local rule-based analysis available. When the optional OpenAI Chat Completions API is configured on the backend, it can also produce a natural-language explanation in response to a question. The assistant supports investigation and recommendations; staff remain responsible for reviewing signals and recording inventory decisions. OpenAI processing is optional and uses a reduced set of the signed-in account's inventory facts.

New accounts can load a small synthetic example from the Investigator panel to try the analysis. The endpoint only adds demo records when the account has no inventory and clearly labels them as synthetic.
