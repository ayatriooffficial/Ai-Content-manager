import React, { useCallback, useEffect, useState } from "react";
import CalendarTimeline from "./CalendarTimeline";
import { fetchCalendars, fetchCalendar } from "../api";

export default function CalendarPanel({ refreshKey }) {
  const [calendars, setCalendars] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [error, setError] = useState(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const list = await fetchCalendars();
      setCalendars(list);
      if (list.length > 0) {
        setSelectedId((prev) => prev || list[0]._id);
      }
    } catch (err) {
      setError(
        err?.response?.status === 404
          ? "Backend route not found — make sure /api/dashboard/calendars is deployed."
          : err?.message || "Failed to load content calendars."
      );
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList, refreshKey]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoadingCalendar(true);
    fetchCalendar(selectedId)
      .then((c) => {
        if (!cancelled) setCalendar(c);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load calendar.");
      })
      .finally(() => {
        if (!cancelled) setLoadingCalendar(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (loadingList) {
    return <div className="py-24 text-center text-slate-500">Loading calendars…</div>;
  }

  if (error) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm rounded-xl px-5 py-4">
        {error}
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <div className="py-24 text-center text-slate-600">
        No content calendar has been generated yet. Trigger the autonomous pipeline to create one.
      </div>
    );
  }

  return (
    <div>
      {calendars.length > 1 && (
        <div className="mb-6">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">
            Campaign
          </label>
          <select
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-white/[0.03] border border-white/10 text-sm text-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-400/40"
          >
            {calendars.map((c) => (
              <option key={c._id} value={c._id} className="bg-[#0e1420]">
                {c.campaignName} — {new Date(c.createdAt).toLocaleDateString()} ({c.status.replace(/_/g, " ").toLowerCase()})
              </option>
            ))}
          </select>
        </div>
      )}

      {loadingCalendar || !calendar ? (
        <div className="py-24 text-center text-slate-500">Loading calendar…</div>
      ) : (
        <CalendarTimeline calendar={calendar} />
      )}
    </div>
  );
}
