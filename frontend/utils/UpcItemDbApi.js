// Wraps the UPCItemDB product lookup API used to auto-fill item details from a barcode/SKU.
// The public "trial" endpoint is free but rate-limited; set NEXT_PUBLIC_UPCITEMDB_API_KEY
// and switch BASE_URL to the paid endpoint for production use.

const BASE_URL = "https://api.upcitemdb.com/prod/trial";

function checkResponse(res) {
  if (res.ok) {
    return res.json();
  }
  return res.json().then((error) => {
    throw new Error(error?.message || `Request failed with status ${res.status}`);
  });
}

function normalizeItem(item) {
  return {
    barcode: item.upc,
    name: item.title,
    brand: item.brand,
    description: item.description,
    imageUrl: item.images?.[0] ?? null,
  };
}

// Looks up a product by its UPC/EAN barcode and returns a normalized item, or null if not found.
export function lookupProductByBarcode(barcode) {
  return fetch(`${BASE_URL}/lookup?upc=${encodeURIComponent(barcode)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })
    .then(checkResponse)
    .then((data) => (data.items && data.items.length > 0 ? normalizeItem(data.items[0]) : null));
}

// Searches products by free-text name and returns a normalized item list.
export function searchProductsByName(query) {
  return fetch(`${BASE_URL}/search?s=${encodeURIComponent(query)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })
    .then(checkResponse)
    .then((data) => (data.items ?? []).map(normalizeItem));
}
