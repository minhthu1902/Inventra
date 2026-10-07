async function request(path, payload, method = "POST") {
  let response;
  try {
    response = await fetch(`/api/auth${path}`, {
      method,
      credentials: "include",
      ...(payload === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }),
    });
  } catch {
    throw new Error(
      "Cannot reach the auth server. Start the backend and MongoDB, then try again.",
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Authentication request failed.");
    error.code = data.code;
    throw error;
  }
  return data;
}

export function signIn(credentials) {
  return request("/signin", credentials);
}

export function signUp(details) {
  return request("/signup", details);
}

export function verifyEmail(token) {
  return request("/verify-email", { token });
}

export function resendVerification(email) {
  return request("/resend-verification", { email });
}

export function getCurrentUser() {
  return request("/me", undefined, "GET");
}

export function signOut() {
  return request("/signout");
}
