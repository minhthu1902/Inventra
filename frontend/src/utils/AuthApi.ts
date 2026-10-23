type User = {
  id: string;
  name: string;
  email: string;
};

type ApiResponse = {
  message?: string;
  verificationUrl?: string;
  user?: User;
};

type ApiError = Error & { code?: string };

async function request(path: string, payload?: unknown, method = "POST"): Promise<ApiResponse> {
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
    const error = new Error(data.message || "Authentication request failed.") as ApiError;
    error.code = data.code ?? String(response.status);
    throw error;
  }
  return data;
}

export function signIn(credentials: { email: string; password: string }) {
  return request("/signin", credentials);
}

export function signUp(details: { name: string; email: string; password: string }) {
  return request("/signup", details);
}

export function verifyEmail(token: string) {
  return request("/verify-email", { token });
}

export function resendVerification(email: string) {
  return request("/resend-verification", { email });
}

export function getCurrentUser() {
  return request("/me", undefined, "GET").then((response) => {
    if (!response.user) {
      throw new Error("The auth server returned no user profile.");
    }
    return { user: response.user };
  });
}

export function signOut() {
  return request("/signout");
}
