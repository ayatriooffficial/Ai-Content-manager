import React from "react";

const STYLES = {
  // Content approval queue (blog / email / whatsapp)
  pending: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  approved: "bg-sky-400/15 text-sky-300 border-sky-400/30",
  rejected: "bg-rose-400/15 text-rose-300 border-rose-400/30",
  published: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",

  // Content calendar (calendar-level + per-slot statuses)
  pending_admin_approval: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  generated: "bg-sky-400/15 text-sky-300 border-sky-400/30",
  in_progress: "bg-sky-400/15 text-sky-300 border-sky-400/30",
  completed: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
};

function formatLabel(status) {
  return status.replace(/_/g, " ");
}

export default function StatusPill({ status }) {
  const s = (status || "pending").toLowerCase();
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border whitespace-nowrap ${
        STYLES[s] || STYLES.pending
      }`}
    >
      {formatLabel(s)}
    </span>
  );
}
