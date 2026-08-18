import React from "react";

const NAV = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "calendar", label: "Calendar", icon: "🗓️" },
  { key: "blog", label: "Blogs", icon: "📝" },
  { key: "email", label: "Emails", icon: "✉️" },
  { key: "whatsapp", label: "WhatsApp", icon: "💬" },
];

export default function Sidebar({ active, onChange, counts }) {
  return (
    <aside className="w-64 shrink-0 bg-[#0e1420] border-r border-white/5 h-screen sticky top-0 flex flex-col">
      <div className="px-6 py-6 border-b border-white/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400 mb-1">Charters</p>
        <h1 className="text-lg font-black tracking-tight text-white">Approval Desk</h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((n) => {
          const pending = counts?.[n.key] ?? 0;
          const isActive = active === n.key;
          return (
            <button
              key={n.key}
              onClick={() => onChange(n.key)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-300 shadow-inner"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <span>{n.icon}</span>
                {n.label}
              </span>
              {n.key !== "overview" && pending > 0 && (
                <span className="text-[10px] font-bold bg-amber-400 text-black px-2 py-0.5 rounded-full">
                  {pending}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-6 py-5 border-t border-white/5 text-[10px] text-slate-500 leading-relaxed">
        All content is held here for review.
        Nothing goes out until an admin approves it.
      </div>
    </aside>
  );
}
