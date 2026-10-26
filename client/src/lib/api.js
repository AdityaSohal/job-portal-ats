import axios from "axios";

const api = axios.create({ baseURL: "/api", withCredentials: true, timeout: 20000 });

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || "";
    // A 401 anywhere except the auth endpoints means the session has ended
    if (error.response?.status === 401 && !url.startsWith("/auth/")) onUnauthorized();
    return Promise.reject(error);
  }
);

export default api;

// Turns any failed request into { message, code, status, fields }
export const getError = (error) => {
  if (!error.response) {
    return {
      message:
        error.code === "ECONNABORTED"
          ? "The request timed out. Please try again."
          : "Can't reach the server. Check your connection and try again.",
      status: 0,
      fields: [],
    };
  }
  const { status, data } = error.response;
  return {
    message: data?.message || "Something went wrong. Please try again.",
    code: data?.code,
    status,
    fields: Array.isArray(data?.errors) ? data.errors : [],
  };
};

// Puts the server's validation messages next to the right fields.
// Returns the messages that had no matching field, so the page can show them at the top.
export const applyFieldErrors = (info, setError, { rename = {}, known = [] } = {}) => {
  const unplaced = [];
  for (const { field, message } of info.fields) {
    const name = rename[field] || field;
    if (known.includes(name)) setError(name, { type: "server", message });
    else unplaced.push(message);
  }
  return unplaced;
};

// Drops empty strings so optional fields aren't sent as ""
export const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v));