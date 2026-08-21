import React from "react";
import StatusPill from "./StatusPill";
import { ActionButtons } from "./PreviewModal";

const COURSE_CLS = {
  CBA: "bg-sky-400/10 text-sky-300 border-sky-400/30",
  DGM: "bg-orange-400/10 text-orange-300 border-orange-400/30",
  TBM: "bg-slate-400/10 text-slate-300 border-slate-400/30",
};

export default function ContentCard({ item, type, onPreview, onAction, busy }) {
  const title = item.title || item.subject || item.headline || "Untitled";
  const excerpt =
    item.summary || item.preheader || item.body || item.emailCopy || item.whatsappMessage || "";
  const meta = item.category || item.audienceSegment || item.audienceCategory || "";
  // Only email/WhatsApp carries a course tag — blogs are a separate SEO stream.
  const course = type === "blog" ? null : item.course;

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusPill status={item.status} />
            {course && (
              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                  COURSE_CLS[course] || COURSE_CLS.CBA
                }`}
              >
                {course}
              </span>
            )}
            {meta && (
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{meta}</span>
            )}
            {item.generatedBy && (
              <span className="text-[10px] uppercase tracking-widest text-slate-600">· {item.generatedBy}</span>
            )}
          </div>
          <h3 className="text-base font-bold text-white truncate">{title}</h3>
          <p className="text-sm text-slate-400 line-clamp-3 mt-1">{excerpt}</p>
        </div>
        <button
          onClick={() => onPreview(item)}
          className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-300 border border-white/10 px-3 py-2 rounded-lg hover:bg-white/5"
        >
          Preview
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
        <ActionButtons item={item} onAction={onAction} busy={busy} />
      </div>
    </div>
  );
}
