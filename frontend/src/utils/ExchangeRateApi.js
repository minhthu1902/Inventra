// Wraps the exchangerate.host API used to price goods from international suppliers.

const BASE_URL = "https://api.exchangerate.host";

function checkResponse(res) {
  if (res.ok) {
    return res.json();
  }
  return res.json().then((error) => {
    throw new Error(
      error?.error?.info || `Request failed with status ${res.status}`,
    );
  });
}

// Returns the latest exchange rates for a base currency, optionally limited to given symbols.
export function getLatestRates(baseCurrency = "USD", symbols = []) {
  const params = new URLSearchParams({ base: baseCurrency });
  if (symbols.length > 0) {
    params.set("symbols", symbols.join(","));
  }

  return fetch(`${BASE_URL}/latest?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })
    .then(checkResponse)
    .then((data) => data.rates);
}

// Converts an amount from one currency to another and returns the converted value.
export function convertAmount(amount, fromCurrency, toCurrency) {
  const params = new URLSearchParams({
    from: fromCurrency,
    to: toCurrency,
    amount: String(amount),
  });

  return fetch(`${BASE_URL}/convert?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })
    .then(checkResponse)
    .then((data) => data.result);
}
