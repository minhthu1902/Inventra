// Wraps the OpenAI Chat Completions API used by the AI Inventory Investigator.
// Requires NEXT_PUBLIC_OPENAI_API_KEY to be set in .env.local.

const BASE_URL = "https://api.openai.com/v1";
const MODEL = "gpt-4o-mini";

function getApiKey() {
  return process.env.NEXT_PUBLIC_OPENAI_API_KEY;
}

function checkResponse(res) {
  if (res.ok) {
    return res.json();
  }
  return res.json().then((error) => {
    throw new Error(
      error?.error?.message || `Request failed with status ${res.status}`,
    );
  });
}

// Sends an inventory question + supporting context and returns the AI's text answer.
export function askInventoryQuestion(question, context) {
  return fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are the Inventra AI Inventory Investigator. Answer questions about stock levels, " +
            "inbound/outbound activity, and anomalies using the inventory context provided by the user.",
        },
        {
          role: "user",
          content: context
            ? `${question}\n\nContext:\n${JSON.stringify(context)}`
            : question,
        },
      ],
      temperature: 0.3,
    }),
  })
    .then(checkResponse)
    .then((data) => data.choices?.[0]?.message?.content ?? "");
}
