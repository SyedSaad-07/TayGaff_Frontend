const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/v1/api";

const TOKEN_KEY = "taygaff_token";

export const tokenStore = {
  get() {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

let unauthorizedHandler = null;

/** Register a handler for expired/missing auth sessions (e.g. logout + redirect). */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
}

function isPublicAuthPath(path) {
  return path === "/auth/login" || path.startsWith("/auth/login?");
}

function handleUnauthorized() {
  tokenStore.clear();
  if (unauthorizedHandler) {
    unauthorizedHandler();
    return;
  }
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  const token = tokenStore.get();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success) {
    const message = body?.message || "Request failed";
    if (response.status === 401 && !isPublicAuthPath(path)) {
      handleUnauthorized();
    }
    throw new ApiError(message, response.status);
  }

  return body.data;
}

export const api = {
  get: (path) => request(path),
  post: (path, data) =>
    request(path, { method: "POST", body: JSON.stringify(data ?? {}) }),
  patch: (path, data) =>
    request(path, { method: "PATCH", body: JSON.stringify(data ?? {}) }),
  delete: (path) => request(path, { method: "DELETE" }),
};
