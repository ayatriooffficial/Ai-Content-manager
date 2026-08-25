import axios from "axios";

function getBaseURL() {
  if (import.meta.env.VITE_API_BASE_URL) {
    const raw = String(import.meta.env.VITE_API_BASE_URL).trim().replace(/\/+$/, "");
    return raw.endsWith("/api") ? raw : `${raw}/api`;
  }
  return "http://localhost:5003/api";
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { "Content-Type": "application/json" },
});

// Each content type maps to a REST resource on the backend.
// "blogs" already exists in the provided backend (routes/blogRoutes.js).
// "emails" and "whatsapp" are expected to follow the exact same contract:
//   GET   /api/<resource>              -> { success, blogs|emails|whatsapp: [...] }
//   GET   /api/<resource>/:id          -> { success, blog|email|whatsapp }
//   PATCH /api/<resource>/:id/status   -> { status: "pending"|"approved"|"rejected"|"published" }
// See README.md in this package for the exact backend routes to add.
export const RESOURCES = {
  blog: { path: "blogs", key: "blogs", singular: "blog" },
  email: { path: "emails", key: "emails", singular: "email" },
  whatsapp: { path: "whatsapp", key: "whatsapp", singular: "whatsapp" },
};

export async function fetchContent(type) {
  const r = RESOURCES[type];
  const res = await api.get(`/${r.path}`);
  return res.data[r.key] || res.data.items || [];
}

export async function updateStatus(type, id, status) {
  const r = RESOURCES[type];
  const res = await api.patch(`/${r.path}/${id}/status`, { status });
  return res.data[r.singular] || res.data;
}

export async function fetchStats() {
  const res = await api.get(`/dashboard/stats`);
  return res.data.stats;
}

// ─── Content Calendar ───
// GET /api/dashboard/calendars           -> { success, calendars: [...] }   (list, most recent first)
// GET /api/dashboard/calendars/:id       -> { success, calendar }          (full doc incl. calendarView)
export async function fetchCalendars() {
  const res = await api.get(`/dashboard/calendars`);
  return res.data.calendars || [];
}

export async function fetchCalendar(id) {
  const res = await api.get(`/dashboard/calendars/${id}`);
  return res.data.calendar;
}

export async function approveCalendarSlot(calendarId, channel, slotKey, selectedOptionIndex = 0) {
  const res = await api.patch(`/dashboard/calendars/${calendarId}/slots/${channel}/${slotKey}/approve`, {
    selectedOptionIndex,
  });
  return res.data.calendar;
}

export async function rejectCalendarSlot(calendarId, channel, slotKey) {
  const res = await api.patch(`/dashboard/calendars/${calendarId}/slots/${channel}/${slotKey}/reject`);
  return res.data.calendar;
}

export async function updateCalendarSlotOption(calendarId, channel, slotKey, optionIndex, option) {
  const res = await api.patch(`/dashboard/calendars/${calendarId}/slots/${channel}/${slotKey}/options/${optionIndex}`, {
    option,
  });
  return res.data.calendar;
}

export async function updateContentItem(type, id, updates) {
  const r = RESOURCES[type];
  const res = await api.patch(`/${r.path}/${id}`, updates);
  return res.data[r.singular] || res.data;
}

export default api;
