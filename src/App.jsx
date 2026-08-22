import React, { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import Overview from "./components/Overview";
import ContentCard from "./components/ContentCard";
import PreviewModal from "./components/PreviewModal";
import CalendarPanel from "./components/CalendarPanel";
import { fetchContent, updateStatus, fetchStats, updateContentItem } from "./api";

const TABS = ["pending", "approved", "rejected", "published"];

export default function App() {
  const [active, setActive] = useState("overview");
  const [data, setData] = useState({ blog: [], email: [], whatsapp: [] });
  const [errors, setErrors] = useState({});
  const [statsError, setStatsError] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("pending");
  const [previewItem, setPreviewItem] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  const loadType = useCallback(async (type) => {
    try {
      const items = await fetchContent(type);
      setData((d) => ({ ...d, [type]: items }));
      setErrors((e) => ({ ...e, [type]: null }));
    } catch (err) {
      const msg =
        err?.response?.status === 404
          ? "Backend route not found — see README.md to add it."
          : err?.message || "Failed to load.";
      setErrors((e) => ({ ...e, [type]: msg }));
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadType("blog"), loadType("email"), loadType("whatsapp")]);
    try {
      setStats(await fetchStats());
      setStatsError(null);
    } catch (err) {
      setStatsError(err?.message || "unreachable");
    }
    setLoading(false);
  }, [loadType]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const counts = useMemo(() => {
    const c = {};
    for (const type of ["blog", "email", "whatsapp"]) {
      c[type] = (data[type] || []).filter((i) => (i.status || "pending") === "pending").length;
    }
    return c;
  }, [data]);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  }

  async function handleAction(type, item, rawStatus) {
    const statusMap = {
      approve: "approved",
      approved: "approved",
      reject: "rejected",
      rejected: "rejected",
      publish: "published",
      published: "published",
      pending: "pending"
    };
    const newStatus = statusMap[rawStatus] || rawStatus;

    setBusyId(item._id);
    try {
      const updated = await updateStatus(type, item._id, newStatus);
      setData((d) => ({
        ...d,
        [type]: d[type].map((i) => (i._id === item._id ? { ...i, ...updated, status: newStatus } : i)),
      }));
      setPreviewItem((p) => (p && p._id === item._id ? { ...p, status: newStatus } : p));
      showToast(`Moved to "${newStatus}"`);
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || "Action failed", false);
    } finally {
      setBusyId(null);
    }
  }

  async function handlePreviewSave(type, item, updates) {
    try {
      const updated = await updateContentItem(type, item._id, updates);
      setData((d) => ({
        ...d,
        [type]: d[type].map((entry) => (entry._id === item._id ? { ...entry, ...updated } : entry)),
      }));
      setPreviewItem((p) => (p && p._id === item._id ? { ...p, ...updated } : p));
      showToast("Preview content saved");
      return updated;
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || "Could not save preview changes", false);
      throw err;
    }
  }

  const activeList = useMemo(() => {
    if (active === "overview") return [];
    return (data[active] || []).filter((i) => (i.status || "pending") === statusTab);
  }, [active, data, statusTab]);

  return (
    <div className="flex min-h-screen bg-[#0b0f14] text-slate-100">
      <Sidebar active={active} onChange={setActive} counts={counts} />

      <main className={`flex-1 px-8 py-8 ${active === "calendar" ? "max-w-full" : "max-w-6xl"}`}>
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white capitalize">
              {active === "overview"
                ? "Overview"
                : active === "calendar"
                ? "Content Calendar"
                : `${active} Approval Queue`}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {active === "overview"
                ? "System-wide snapshot of the review pipeline."
                : active === "calendar"
                ? "What's planned across blogs, email, and WhatsApp before content gets generated."
                : "Review AI-generated content before it goes live."}
            </p>
          </div>
          <button
            onClick={() => (active === "calendar" ? setCalendarRefreshKey((k) => k + 1) : loadAll())}
            className="text-xs font-bold uppercase tracking-widest border border-white/10 px-4 py-2 rounded-lg hover:bg-white/5"
          >
            ⟳ Refresh
          </button>
        </header>

        {active === "overview" ? (
          <Overview stats={stats} counts={counts} statsError={statsError} />
        ) : active === "calendar" ? (
          <CalendarPanel refreshKey={calendarRefreshKey} />
        ) : (
          <>
            <div className="flex gap-2 mb-6">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setStatusTab(t)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                    statusTab === t
                      ? "bg-white text-black"
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {errors[active] && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm rounded-xl px-5 py-4 mb-6">
                {errors[active]}
              </div>
            )}

            {loading ? (
              <div className="py-24 text-center text-slate-500">Loading…</div>
            ) : activeList.length === 0 ? (
              <div className="py-24 text-center text-slate-600">Nothing here yet.</div>
            ) : (
              <div className="grid gap-4">
                {activeList.map((item) => (
                  <ContentCard
                    key={item._id}
                    item={item}
                    type={active}
                    onPreview={setPreviewItem}
                    onAction={(it, status) => handleAction(active, it, status)}
                    busy={busyId === item._id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {previewItem && (
        <PreviewModal
          item={previewItem}
          type={active}
          onClose={() => setPreviewItem(null)}
          onAction={(it, status) => handleAction(active, it, status)}
          onSaveEdited={(it, updates) => handlePreviewSave(active, it, updates)}
          busy={busyId === previewItem._id}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl z-[60] ${
            toast.ok ? "bg-emerald-500 text-black" : "bg-rose-500 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
