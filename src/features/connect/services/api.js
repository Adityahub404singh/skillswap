
import { useAuthStore } from "@/store/auth";

// =====================================================
// API CONFIGURATION
// =====================================================

const DEFAULT_DEV_API = "http://localhost:3001";

const DEFAULT_PROD_API =
  "https://skillswap-b59w.onrender.com";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? DEFAULT_DEV_API
    : DEFAULT_PROD_API)
).trim().replace(/\/+$/, "");

// Accept either the backend origin or an origin that already ends in /api.
const API_ROOT = /\/api$/i.test(API_BASE)
  ? API_BASE
  : `${API_BASE}/api`;

const API = `${API_ROOT}/connect`;

// =====================================================
// CUSTOM API ERROR
// =====================================================

export class ConnectApiError extends Error {
  constructor({
    message = "Connect request failed",
    status = 0,
    code = null,
    details = null,
    data = null,
  } = {}) {
    super(message);

    this.name = "ConnectApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.data = data;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConnectApiError);
    }
  }
}

// =====================================================
// REQUEST HELPERS
// =====================================================

function isFormData(value) {
  return (
    typeof FormData !== "undefined" &&
    value instanceof FormData
  );
}

function isBlob(value) {
  return (
    typeof Blob !== "undefined" &&
    value instanceof Blob
  );
}

function isURLSearchParams(value) {
  return (
    typeof URLSearchParams !== "undefined" &&
    value instanceof URLSearchParams
  );
}

function isBodyPresent(body) {
  return body !== undefined && body !== null;
}

function createHeaders(options = {}) {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const body = options.body;

  // Let the browser set the multipart boundary.
  if (isFormData(body)) {
    headers.delete("Content-Type");
  } else if (
    isBodyPresent(body) &&
    !headers.has("Content-Type") &&
    !isBlob(body) &&
    !isURLSearchParams(body)
  ) {
    headers.set("Content-Type", "application/json");
  }

  // Read the latest token from Zustand.
  const storedToken = useAuthStore.getState()?.token;
  const token = storedToken == null
    ? ""
    : String(storedToken)
        .trim()
        .replace(/^Bearer\s+/i, "")
        .replace(/^["']|["']$/g, "");

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

// =====================================================
// RESPONSE PARSER
// =====================================================

async function parseResponse(response) {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const contentType =
    response.headers.get("content-type") || "";

  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(responseText);
    } catch {
      throw new ConnectApiError({
        message: "Server returned invalid JSON",
        status: response.status,
        code: "INVALID_RESPONSE",
      });
    }
  }

  return responseText;
}

// =====================================================
// ERROR MESSAGE EXTRACTOR
// =====================================================

function getErrorMessage(data, status) {
  if (typeof data === "string") {
    const cleaned = data
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned) {
      return cleaned.slice(0, 500);
    }
  }

  if (data && typeof data === "object") {
    if (typeof data.error === "string") {
      return data.error;
    }

    if (typeof data.message === "string") {
      return data.message;
    }

    if (typeof data.detail === "string") {
      return data.detail;
    }
  }

  return `Connect request failed (${status})`;
}

// =====================================================
// MAIN API FUNCTION
// =====================================================

export async function api(path, options = {}) {
  if (typeof path !== "string" || !path.trim()) {
    throw new TypeError(
      "Connect API path must be a non-empty string"
    );
  }

  // Keep requests inside the Connect API.
  if (/^https?:\/\//i.test(path)) {
    throw new TypeError(
      "Pass a relative Connect API path, not a full URL"
    );
  }

  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const url = `${API}${normalizedPath}`;

  const headers = createHeaders(options);

  const requestOptions = {
    ...options,
    headers,
    credentials: options.credentials ?? "include",
    cache: options.cache ?? "no-store",
  };

  let response;

  // ===================================================
  // NETWORK REQUEST
  // ===================================================

  try {
    response = await fetch(url, requestOptions);
  } catch (error) {
    // Preserve intentional request cancellation.
    if (error?.name === "AbortError") {
      throw error;
    }

    throw new ConnectApiError({
      message:
        `Connect API unreachable at ${API_BASE}. ` +
        "Check backend availability, network and CORS.",
      status: 0,
      code: "NETWORK_ERROR",
      data: error instanceof Error
        ? error.message
        : null,
    });
  }

  // ===================================================
  // RESPONSE PARSING
  // ===================================================

  let data;

  try {
    data = await parseResponse(response);
  } catch (error) {
    if (error instanceof ConnectApiError) {
      throw error;
    }

    throw new ConnectApiError({
      message: "Unable to read server response",
      status: response.status,
      code: "RESPONSE_PARSE_ERROR",
    });
  }

  // ===================================================
  // HTTP ERROR HANDLING
  // ===================================================

  if (!response.ok) {
    throw new ConnectApiError({
      message: getErrorMessage(data, response.status),
      status: response.status,
      code:
        data && typeof data === "object"
          ? data.code || null
          : null,
      details:
        data && typeof data === "object"
          ? data.details || null
          : null,
      data,
    });
  }

  return data;
}

// =====================================================
// CONVENIENCE API METHODS
// =====================================================

export const connectApi = {
  get(path, options = {}) {
    return api(path, {
      ...options,
      method: "GET",
    });
  },

  post(path, body, options = {}) {
    return api(path, {
      ...options,
      method: "POST",
      body: isBodyPresent(body) && !isFormData(body)
        && !isBlob(body) && !isURLSearchParams(body)
        && typeof body !== "string"
          ? JSON.stringify(body)
          : body,
    });
  },

  put(path, body, options = {}) {
    return api(path, {
      ...options,
      method: "PUT",
      body: isBodyPresent(body) && !isFormData(body)
        && !isBlob(body) && !isURLSearchParams(body)
        && typeof body !== "string"
          ? JSON.stringify(body)
          : body,
    });
  },

  patch(path, body, options = {}) {
    return api(path, {
      ...options,
      method: "PATCH",
      body: isBodyPresent(body) && !isFormData(body)
        && !isBlob(body) && !isURLSearchParams(body)
        && typeof body !== "string"
          ? JSON.stringify(body)
          : body,
    });
  },

  delete(path, options = {}) {
    return api(path, {
      ...options,
      method: "DELETE",
    });
  },
};

// =====================================================
// FILE UPLOAD HELPER
// =====================================================

export async function uploadConnectFile(
  path,
  file,
  fieldName = "file",
  options = {}
) {
  if (!file) {
    throw new TypeError("A file is required");
  }

  const formData = new FormData();

  formData.append(fieldName, file);

  return api(path, {
    ...options,
    method: "POST",
    body: formData,
  });
}
