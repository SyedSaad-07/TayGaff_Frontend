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
  constructor(message, status, extras = {}) {
    super(message);
    this.status = status;
    this.name = "ApiError";
    this.code = extras.code || null;
    this.errors = extras.errors || null;
    this.referenceId = extras.referenceId || null;
  }
}

/**
 * Safe user-facing message from an ApiError / unknown catch value.
 * Never stringify the whole error object into the UI.
 */
export function getErrorMessage(err, fallback = "Something went wrong") {
  if (err instanceof ApiError) {
    if (Array.isArray(err.errors) && err.errors.length) {
      return err.errors
        .map((e) => e.message)
        .filter(Boolean)
        .join(" ");
    }
    if (err.message) return err.message;
  }
  return fallback;
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

function isSafeClientMessage(message) {
  if (!message || typeof message !== "string") return false;
  // Reject leaks of internal keys / infra
  if (/["']?[a-z]+[A-Z][a-zA-Z]*["']?/.test(message) && /must be|is required|is not allowed/i.test(message)) {
    return false;
  }
  if (/prisma|P20\d{2}|ECONN|SQL|stack|at\s+\S+\(|node_modules/i.test(message)) {
    return false;
  }
  return true;
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  const token = tokenStore.get();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      "Cannot reach the server. Please check your connection and try again.",
      0
    );
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success) {
    const rawMessage = body?.message;
    const message = isSafeClientMessage(rawMessage)
      ? rawMessage
      : response.status === 404
        ? "The requested resource was not found."
        : response.status === 401
          ? "Please sign in to continue."
          : response.status === 403
            ? "You do not have permission to do that."
            : response.status >= 500
              ? body?.referenceId
                ? `Something went wrong. Please try again. (Ref: ${body.referenceId})`
                : "Something went wrong. Please try again."
              : "Request failed. Please check your input and try again.";

    if (response.status === 401 && !isPublicAuthPath(path)) {
      handleUnauthorized();
    }

    throw new ApiError(message, response.status, {
      code: body?.code || null,
      errors: Array.isArray(body?.errors) ? body.errors : null,
      referenceId: body?.referenceId || null,
    });
  }

  return body.data;
}

async function requestForm(path, formData, { method = "POST" } = {}) {
  const headers = new Headers();
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Do not set Content-Type — browser sets multipart boundary.

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: formData,
    });
  } catch {
    throw new ApiError(
      "Cannot reach the server. Please check your connection and try again.",
      0
    );
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success) {
    const rawMessage = body?.message;
    const message = isSafeClientMessage(rawMessage)
      ? rawMessage
      : response.status >= 500
        ? "Something went wrong. Please try again."
        : "Upload failed. Please check the file and try again.";
    if (response.status === 401) handleUnauthorized();
    throw new ApiError(message, response.status, {
      code: body?.code || null,
      errors: Array.isArray(body?.errors) ? body.errors : null,
      referenceId: body?.referenceId || null,
    });
  }
  return body.data;
}

export const api = {
  get: (path) => request(path),
  post: (path, data) =>
    request(path, { method: "POST", body: JSON.stringify(data ?? {}) }),
  patch: (path, data) =>
    request(path, { method: "PATCH", body: JSON.stringify(data ?? {}) }),
  delete: (path, data) =>
    request(path, {
      method: "DELETE",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  postForm: (path, formData) => requestForm(path, formData, { method: "POST" }),
  patchForm: (path, formData) =>
    requestForm(path, formData, { method: "PATCH" }),
};
