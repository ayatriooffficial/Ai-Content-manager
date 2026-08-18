import React, { useEffect, useState } from "react";
import StatusPill from "./StatusPill";

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  );
}

function getEditableFields(type) {
  if (type === "blog") {
    return [
      { key: "title", label: "Title", type: "text" },
      { key: "summary", label: "Summary", type: "textarea" },
      { key: "metaDescription", label: "Meta Description", type: "textarea" },
      { key: "content", label: "Content", type: "textarea" },
      { key: "category", label: "Category", type: "text" },
    ];
  }

  if (type === "email") {
    return [
      { key: "subject", label: "Subject", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "tag", label: "Tag", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      { key: "bullets", label: "Bullets", type: "textarea" },
    ];
  }

  return [
    { key: "audienceSegment", label: "Audience Segment", type: "text" },
    { key: "headline", label: "Headline", type: "text" },
    { key: "whatsappMessage", label: "Message", type: "textarea" },
    { key: "ctaText", label: "CTA", type: "text" },
  ];
}

function buildDraft(item, type) {
  if (!item) return {};
  if (type === "email") {
    return {
      ...item,
      bullets: Array.isArray(item.bullets) ? item.bullets.join("\n") : (item.bullets || ""),
      program: item.program ? JSON.stringify(item.program, null, 2) : "",
    };
  }
  return { ...item };
}

export default function PreviewModal({ item, type, onClose, onAction, onSaveEdited, busy }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({});

  useEffect(() => {
    if (item) setDraft(buildDraft(item, type));
  }, [item, type]);

  if (!item) return null;

  const title = item.title || item.subject || item.headline || "Untitled";

  const saveEdited = async () => {
    if (!onSaveEdited) return;

    const cleanDraft = { ...draft };
    if (type === "email") {
      if (typeof cleanDraft.bullets === "string") {
        cleanDraft.bullets = cleanDraft.bullets
          .split(/\n|\r\n/)
          .map((line) => line.trim())
          .filter(Boolean);
      }

      if (typeof cleanDraft.program === "string") {
        try {
          cleanDraft.program = cleanDraft.program ? JSON.parse(cleanDraft.program) : null;
        } catch {
          cleanDraft.program = null;
        }
      }
    }

    delete cleanDraft._id;
    delete cleanDraft.__v;
    delete cleanDraft.createdAt;

    try {
      await onSaveEdited(item, cleanDraft);
      setIsEditing(false);
    } catch (err) {
      console.error("Edit save failed", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-[#0e1420] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0e1420] px-6 py-4 border-b border-white/5 flex items-start justify-between gap-4">
          <div>
            <StatusPill status={item.status} />
            <h2 className="text-xl font-bold text-white mt-2">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800/80 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-200 hover:border-sky-400/60 hover:text-sky-200"
              >
                ✎ Edit
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>

        <div className="px-6 py-5">
          {isEditing ? (
            <div className="space-y-3">
              {getEditableFields(type).map((field) => (
                <label key={`${type}-${field.key}`} className="block text-left">
                  <span className="block text-[8px] font-bold uppercase tracking-widest text-slate-500 mb-1">{field.label}</span>
                  {field.type === "textarea" ? (
                    <textarea
                      value={draft?.[field.key] ?? ""}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      rows={5}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-400/40 focus:outline-none"
                    />
                  ) : (
                    <input
                      value={draft?.[field.key] ?? ""}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-400/40 focus:outline-none"
                    />
                  )}
                </label>
              ))}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdited}
                  className="px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-[10px] font-bold uppercase tracking-widest text-emerald-200"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {type === "blog" && (
                <>
                  <Field label="Summary" value={item.summary} />
                  <Field label="Category" value={item.category} />
                  <Field label="Meta Description" value={item.metaDescription} />
                  <Field label="Content" value={item.content} />
                </>
              )}
              {type === "email" && (
                <>
                  <Field label="Tag" value={item.tag} />
                  <Field label="Subject" value={item.subject || item.title} />
                  <Field label="Heading" value={item.heading} />
                  <Field label="Intro" value={item.intro} />
                  <Field label="Audience Segment" value={item.audienceSegment} />
                  <Field label="Preheader" value={item.preheader} />
                  <Field label="Headline" value={item.headline} />
                  <Field label="Email Copy" value={item.emailCopy} />
                  <Field label="CTA" value={item.ctaText} />
                  {Array.isArray(item.stats) && item.stats.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Stats</p>
                      <div className="space-y-2">
                        {item.stats.map((stat, idx) => (
                          <div key={`${stat.label || 'stat'}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                            <div className="text-[10px] uppercase tracking-wider text-slate-400">{stat.label}</div>
                            <div className="text-sm text-slate-100 mt-1">{stat.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(item.bullets) && item.bullets.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Bullets</p>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-slate-200 leading-relaxed">
                        {item.bullets.map((bullet, idx) => (
                          <li key={`${bullet}-${idx}`}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(item.programs) && item.programs.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Programs</p>
                      <div className="space-y-2">
                        {item.programs.map((program, idx) => (
                          <div key={`${program?.name || 'program'}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-sm text-slate-200">
                            <div className="font-semibold text-white">{program?.name || "Program"}</div>
                            {program?.duration && <div>Duration: {program.duration}</div>}
                            {program?.format && <div>Format: {program.format}</div>}
                            {program?.placement && <div>Placement: {program.placement}</div>}
                            {program?.emi && <div>EMI: {program.emi}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.program && (
                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Selected Program</p>
                      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-sm text-slate-200">
                        <div className="font-semibold text-white">{item.program.name || "Program"}</div>
                        {item.program.duration && <div>Duration: {item.program.duration}</div>}
                        {item.program.format && <div>Format: {item.program.format}</div>}
                        {item.program.placement && <div>Placement: {item.program.placement}</div>}
                        {item.program.emi && <div>EMI: {item.program.emi}</div>}
                      </div>
                    </div>
                  )}
                </>
              )}
              {type === "whatsapp" && (
                <>
                  <Field label="Audience Segment" value={item.audienceSegment} />
                  <Field label="Headline" value={item.headline} />
                  <Field label="Message" value={item.whatsappMessage} />
                  <Field label="CTA" value={item.ctaText} />
                </>
              )}
            </>
          )}
        </div>

        {!isEditing && (
          <div className="sticky bottom-0 bg-[#0e1420] px-6 py-4 border-t border-white/5 flex flex-wrap gap-2 justify-end">
            <ActionButtons item={item} onAction={onAction} busy={busy} />
          </div>
        )}
      </div>
    </div>
  );
}

export function ActionButtons({ item, onAction, busy }) {
  const status = item.status || "pending";
  return (
    <>
      {status !== "rejected" && (
        <button
          disabled={busy}
          onClick={() => onAction(item, "rejected")}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 disabled:opacity-40"
        >
          Reject
        </button>
      )}
      {status === "pending" && (
        <button
          disabled={busy}
          onClick={() => onAction(item, "approved")}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 disabled:opacity-40"
        >
          Approve
        </button>
      )}
      {status === "approved" && (
        <button
          disabled={busy}
          onClick={() => onAction(item, "published")}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 disabled:opacity-40"
        >
          Publish / Send Now
        </button>
      )}
      {status === "rejected" && (
        <button
          disabled={busy}
          onClick={() => onAction(item, "pending")}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 disabled:opacity-40"
        >
          Move back to Pending
        </button>
      )}
    </>
  );
}
