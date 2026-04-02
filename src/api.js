const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  getEvents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/events${qs ? `?${qs}` : ""}`);
  },
  getStats: () => request("/stats"),
  createEvent: (event) => request("/events", { method: "POST", body: JSON.stringify(event) }),
  updateEvent: (id, event) => request(`/events/${id}`, { method: "PUT", body: JSON.stringify(event) }),
  deleteEvent: (id) => request(`/events/${id}`, { method: "DELETE" }),
  exportData: () => request("/export"),
  importData: (events) => request("/import", { method: "POST", body: JSON.stringify(events) }),
};
