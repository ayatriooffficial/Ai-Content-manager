import React, { useEffect, useState } from "react";
import StatusPill from "./StatusPill";

// Shared poster set (same images used by email + WhatsApp bulk sends).
// Picks one randomly so the preview matches the live "random per send" behavior.
const POSTERS = ["1.jpg", "2.jpg", "3.jpg", "5.jpg", "6.jpg"];
function randomPoster() {
  return `/posters/${POSTERS[Math.floor(Math.random() * POSTERS.length)]}`;
}

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
      { key: "bullets", label: "Bullets (1 per line)", type: "textarea" },
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

const BOLD_KEYWORDS = [
  "Charters Union of Business", "Charters Union", "CBA™", "DGM™", "TBM™", "CBA", "DGM", "TBM",
  "Certified Business Accountant", "Digital Growth & Marketing", "Technology & Business Management",
  "AI Career Engine", "experiential learning", "hands-on simulations", "real-world simulations",
  "100% In-Class Paid Internships", "in-class paid internships", "in-class paid internship",
  "SAP S/4HANA", "TallyPrime", "GST", "TDS", "GA4", "Meta", "Google Ads", "ROAS",
  "KPMG", "PwC", "EY", "Deloitte", "Saudi Aramco", "₹5,555", "₹16,000",
  "No-Cost EMI", "scholarship", "Scholarship", "success fee", "Success Fee",
  "97.7%", "92%", "98%", "95%", "placement rate", "Placement Rate",
  "26.5 LPA", "24.5 LPA", "38.5 LPA", "CTC", "salary jump", "Salary Jump",
  "7 countries", "7 Countries", "3.05x", "3.05X", "KVS"
];

function boldKeywords(text) {
  if (!text) return text;
  let out = String(text);
  // Longest-first so "100% In-Class Paid Internships" wins over the shorter
  // "in-class paid internships" and both don't get half-bolded.
  const sorted = [...BOLD_KEYWORDS].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const needsWordBoundary = kw.replace(/[^a-zA-Z0-9]/g, "").length <= 4;
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Don't match inside/adjacent to an existing **bold** or *bold* span.
    const pattern = needsWordBoundary ? `(?<![\\w*])${escaped}(?![\\w*])` : escaped;
    const re = new RegExp(`(?<![\\w*])${pattern}(?![\\w*])`, "gi");
    out = out.replace(re, (m) => {
      const clean = m.trim();
      if (!clean) return m;
      return `**${clean}**`;
    });
  }
  out = out.replace(/\*\*(\*+)/g, "**").replace(/(\*+)\*\*/g, "**");
  return out;
}

function formatRichText(text, isDark = false) {
  if (!text) return text;
  let str = boldKeywords(String(text));
  
  // Clean raw HTML tags if present in data
  str = str.replace(/<\/?u>/gi, "");
  str = str.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  str = str.replace(/<b>(.*?)<\/b>/gi, "**$1**");
  str = str.replace(/<em>(.*?)<\/em>/gi, "_$1_");
  str = str.replace(/<i>(.*?)<\/i>/gi, "_$1_");

  // Match **double-star bold**, *single-star bold*, `code`, _italics_, ~strikethrough~
  const tokenRegex = /(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|~[^~]+~)/g;
  const parts = str.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith("```") && part.endsWith("```")) {
      return (
        <code key={idx} className={`font-mono px-1 py-0.5 rounded text-xs ${isDark ? "bg-[#111b21] text-[#25d366]" : "bg-slate-100 text-slate-800"}`}>
          {part.slice(3, -3)}
        </code>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} className={`font-mono px-1 py-0.5 rounded text-xs ${isDark ? "bg-[#111b21] text-[#25d366]" : "bg-slate-100 text-slate-800"}`}>
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <strong key={idx} className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
          {part.slice(1, -1)}
        </strong>
      );
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return (
        <em key={idx} className={`italic ${isDark ? "text-slate-300" : "text-slate-700"}`}>
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("~") && part.endsWith("~")) {
      return (
        <del key={idx} className="line-through text-slate-400">
          {part.slice(1, -1)}
        </del>
      );
    }
    return part;
  });
}

function formatWhatsAppInline(text) {
  return formatRichText(text, true);
}

// Detects a WhatsApp section heading: a short line that is entirely bold
// (*Heading:*), typically ending with a colon — e.g. the problem heading,
// points heading, and solution heading in the 7-part layout.
function isWhatsAppHeading(trimmed) {
  if (!trimmed || trimmed.length > 60) return false;
  const boldMatch = trimmed.match(/^\*([^*]+)\*$/);
  if (!boldMatch) return false;
  const inner = boldMatch[1].trim();
  return inner.length > 0 && inner.length <= 50 && /:$/.test(inner);
}

function WhatsAppVisualPreview({ message, headline }) {
  const cleanMsg = message || headline || "";
  const lines = cleanMsg.split("\n");
  const poster = randomPoster();

  return (
    <div className="my-4 rounded-xl border border-[#222e35] bg-[#0b141a] p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between border-b border-[#222e35] pb-2 text-[11px] text-[#8696a0]">
        <span className="flex items-center gap-1.5 font-medium text-[#00a884]">
          <span className="inline-block h-2 w-2 rounded-full bg-[#00a884]"></span>
          WhatsApp Candidate View
        </span>
        <span>Official Admissions Channel</span>
      </div>

      <div className="flex justify-start">
        <div className="w-full max-w-[96%] sm:max-w-[90%] rounded-xl bg-[#1f2c34] p-3.5 text-sm text-[#e9edef] shadow-md border border-[#2a3942]">
          {/* Poster image — same random set as the live WhatsApp sends */}
          <div className="mb-3 overflow-hidden rounded-lg">
            <img src={poster} alt="Charters Union" className="w-full h-auto object-cover" style={{ aspectRatio: "16/9" }} />
          </div>
          <div className="space-y-2.5 leading-relaxed">
            {lines.map((line, i) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={i} className="h-1" />;
              }
              if (trimmed.startsWith("> ")) {
                return (
                  <div key={i} className="border-l-4 border-[#00a884] bg-[#111b21] px-3 py-2 text-xs text-[#8696a0] rounded-r my-1">
                    {formatWhatsAppInline(trimmed.replace(/^>\s*/, ""))}
                  </div>
                );
              }
              if (trimmed.includes("🌐") || trimmed.includes("Visit:") || trimmed.includes("Apply:")) {
                return (
                  <div key={i} className="mt-2 pt-2 border-t border-[#2a3942]/60 text-[11px] sm:text-xs text-[#00a884] font-medium tracking-tight">
                    {formatWhatsAppInline(trimmed)}
                  </div>
                );
              }
              if (isWhatsAppHeading(trimmed)) {
                // Section heading (problem/points/solution) — distinct styling
                return (
                  <div key={i} className="mt-2.5 mb-0.5 flex items-center gap-2">
                    <div className="h-4 w-1 rounded-full bg-[#00a884]" />
                    <div className="text-[13px] font-bold text-[#e9edef] tracking-tight">
                      {formatWhatsAppInline(trimmed)}
                    </div>
                  </div>
                );
              }
              return <p key={i} className="m-0">{formatWhatsAppInline(trimmed)}</p>;
            })}
          </div>
          <div className="mt-2.5 flex items-center justify-end gap-1 text-[10px] text-[#8696a0]">
            <span>10:00 AM</span>
            <span className="text-[#53bdeb]">✓✓</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function cleanBulletText(str) {
  return String(str || "")
    .replace(/^\d+[\.\)]\s*/, "") // remove leading "1. " or "1) "
    .replace(/^(Core\s*Point\s*\d+:?|Point\s*\d+:?)\s*/i, "") // strip "Core Point 1:"
    .trim();
}

function EmailVisualPreview({ item }) {
  const subject = item.subject || item.title || "";
  const heading = item.heading || "";
  const intro = item.intro || "";
  const rawBullets = Array.isArray(item.bullets) ? item.bullets : (item.bullets ? [item.bullets] : []);
  const rawSimulations = Array.isArray(item.simulations) ? item.simulations : [];
  const bullets = rawBullets.map(cleanBulletText).filter(Boolean);
  const simulations = rawSimulations.map(cleanBulletText).filter(Boolean);
  const programDetails = item.programDetails || null;
  const eventDetails = item.eventDetails || null;
  const tableData = item.tableData || null;
  const closingNotice = item.closingNotice || "";
  const solution = item.solution || "";
  const applyUrl = item.ctaUrl || "https://chartersunion.com/apply";
  const brochureUrl = item.brochureUrl || "";
  const ctaText = item.ctaText || "Click to Register";

  const isDGM = (item.course || item.tag || subject || "").toUpperCase().includes("DGM") || (item.course || "").toUpperCase().includes("MARKETING");
  const slotKey = String(item.slotKey || "").toLowerCase();
  
  // Respect item.format directly; only deduce from slotKey if item.format is absent
  let format = item.format;
  if (!format) {
    if (slotKey.includes("2") || slotKey.endsWith("_2")) format = "webinar";
    else if (slotKey.includes("3") || slotKey.endsWith("_3")) format = "table";
    else if (slotKey.includes("4") || slotKey.endsWith("_4")) format = "case_study";
    else if (slotKey.includes("5") || slotKey.endsWith("_5")) format = "urgency";
    else if (slotKey.includes("6") || slotKey.endsWith("_6")) format = "final_call";
    else format = "simulation";
  }

  const activeBullets = simulations.length > 0 ? simulations : bullets;

  return (
    <div className="my-4 rounded-xl border border-slate-300 bg-[#f5f5f5] text-slate-900 shadow-xl overflow-hidden max-w-2xl mx-auto p-4 sm:p-6">
      {/* Subject Header */}
      <div className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 mb-4">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject Line</div>
        <div className="text-sm font-bold text-slate-900 mt-0.5">{subject || "No subject"}</div>
      </div>

      {/* Main Clean Email White Card */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-xs">
        {/* Hero Banner Header Image with Red Divider */}
        <div className="w-full border-b-2 border-[#b01b2e]">
          <img src={randomPoster()} alt="Charters Union banner" className="w-full h-auto object-cover" style={{ aspectRatio: "16/9" }} />
        </div>

        <div className="p-6 sm:p-8 space-y-4 text-[14px] text-[#222222] leading-relaxed">
          <p className="font-semibold text-slate-900">Dear Student,</p>
          <div className="text-slate-800 leading-relaxed space-y-3 whitespace-pre-wrap">{formatRichText(intro, false)}</div>

          {/* ── FORMAT 1: SIMULATIONS & CURRICULUM ── */}
          {format === "simulation" && (
            <>
              {heading && (
                <div className="pt-2">
                  <div className="text-[15px] font-bold text-slate-900 mb-2 underline">
                    <u>{heading}</u>
                  </div>
                </div>
              )}
              {activeBullets.length > 0 && (
                <ol className="list-decimal pl-5 space-y-2 text-slate-800">
                  {activeBullets.map((s, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {formatRichText(s, false)}
                    </li>
                  ))}
                </ol>
              )}

              {programDetails && Object.keys(programDetails).length > 0 && (
                <div className="pt-2">
                  <div className="text-[15px] font-bold text-slate-900 mb-2 underline">
                    <u>Programme Details:</u>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-800 space-y-1 leading-relaxed">
                    {programDetails?.duration ? <div><strong>Dates:</strong> {programDetails.duration}</div> : null}
                    {programDetails?.mode ? <div><strong>Mode:</strong> {programDetails.mode}</div> : null}
                    {programDetails?.eligibility ? <div><strong>Eligibility:</strong> {programDetails.eligibility}</div> : null}
                    {programDetails?.feeFinancing ? <div><strong>Fee:</strong> {programDetails.feeFinancing}</div> : null}
                    {programDetails?.scholarship ? <div><strong>Scholarship:</strong> {programDetails.scholarship}</div> : null}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── FORMAT 2: MASTERCLASS & WEBINAR ── */}
          {format === "webinar" && (
            <>
              {heading && (
                <div className="pt-2">
                  <div className="text-[15px] font-bold text-slate-900 mb-2 underline">
                    <u>{heading}</u>
                  </div>
                </div>
              )}
              {eventDetails && Object.keys(eventDetails).length > 0 && (
                <div className="text-xs sm:text-sm text-slate-800 space-y-1 leading-relaxed mb-3">
                  {eventDetails?.date ? <div><strong>Date &amp; Time:</strong> {eventDetails.date}{eventDetails?.time ? ` (${eventDetails.time})` : ""}</div> : null}
                  {eventDetails?.platform ? <div><strong>Platform:</strong> {eventDetails.platform}</div> : null}
                  {eventDetails?.topic ? <div><strong>Session Topic:</strong> {eventDetails.topic}</div> : null}
                </div>
              )}

              {bullets.length > 0 && (
                <>
                  <div className="text-[14px] font-bold text-slate-900 mb-2">In this session we will cover:</div>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-800">
                    {bullets.map((b, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {formatRichText(b, false)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {/* ── FORMAT 3: TABULAR COMPARISON & EVENTS ── */}
          {format === "table" && (
            <>
              {heading && (
                <div className="pt-2">
                  <div className="text-[15px] font-bold text-slate-900 mb-2 underline">
                    <u>{heading}</u>
                  </div>
                </div>
              )}
              {tableData?.rows?.length > 0 && (
                <div className="overflow-x-auto my-3">
                  <table className="w-full text-left text-xs border-collapse border border-black bg-white">
                    <thead>
                      <tr className="bg-white border-b border-black text-black font-bold text-center">
                        {(tableData.headers || ["Event Type", "Event", "Date & Time", "Venue/Platform", "Registration Link"]).map((h, hIdx) => (
                          <th key={hIdx} className="p-2.5 border-r border-black whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows.map((r, rIdx) => (
                        <tr key={rIdx} className="border-b border-black">
                          <td className="p-2.5 font-bold text-black border-r border-black text-center">{r[0]}</td>
                          <td className="p-2.5 text-black border-r border-black">{r[1]}</td>
                          <td className="p-2.5 text-black border-r border-black text-center whitespace-nowrap">{r[2]}</td>
                          <td className="p-2.5 text-black border-r border-black text-center whitespace-nowrap">{r[3] || "Zoom"}</td>
                          <td className="p-2.5 font-bold text-[#b01b2e] underline text-center whitespace-nowrap">
                            {r[4] && r[4] !== "Link" ? (
                              <a href={r[4]} target="_blank" rel="noreferrer">{r[4].replace(/^https?:\/\//, "")}</a>
                            ) : (
                              <a href={applyUrl} target="_blank" rel="noreferrer">Register</a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bullets.length > 0 && (
                <ul className="list-disc pl-5 space-y-1.5 text-slate-800 pt-2">
                  {bullets.map((b, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {formatRichText(b, false)}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* ── FORMAT 4 & 5 & 6: CASE STUDY / URGENCY / CLOSING NOTICE ── */}
          {(format === "case_study" || format === "urgency" || format === "final_call") && (
            <>
              {heading && (
                <div className="pt-2">
                  <div className="text-[15px] font-bold text-slate-900 mb-2 underline">
                    <u>{heading}</u>
                  </div>
                </div>
              )}
              {closingNotice && (
                <p className="text-slate-800 mb-3">{formatRichText(closingNotice, false)}</p>
              )}
              {bullets.length > 0 && (
                <ul className="list-disc pl-5 space-y-2 text-slate-800">
                  {bullets.map((b, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {formatRichText(b, false)}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {solution && (
            <div className="pt-2">
              <div className="border-l-4 border-[#b01b2e] bg-[#faf5f0] rounded-r px-4 py-3">
                <div className="text-[13px] font-bold text-slate-900 mb-1">The Solution</div>
                <p className="text-sm text-slate-800 leading-relaxed">{formatRichText(solution, false)}</p>
              </div>
            </div>
          )}

          <p className="text-xs sm:text-sm text-slate-700 pt-2">
            Check out the Programme Brochure <a href={brochureUrl || applyUrl} target="_blank" rel="noreferrer" className="text-[#b01b2e] underline font-bold">here</a>.
          </p>

          {/* Clean Red Outline Button */}
          <div className="text-center py-4">
            <a
              href={applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-8 py-2.5 border-1.5 border-[#b01b2e] text-[#b01b2e] font-bold text-sm rounded bg-white hover:bg-red-50 transition"
            >
              {ctaText}
            </a>
          </div>

          {/* Helpline */}
          <div className="pt-4 text-xs text-slate-600 space-y-3">
            <p>
              For any queries, please reach out to the Admissions Office or reply directly to this email.
            </p>
            <p className="text-slate-800">
              Warm regards,<br />
              <strong>Charters Union Admissions</strong>
            </p>
          </div>

          {/* Footer (matches the sent email — at the very bottom) */}
          <div className="mt-6 pt-4 border-t-2 border-[#b01b2e]">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-2">
              Dive Deeper into our Undergraduate Programmes
            </div>
            <div className="text-sm font-semibold text-slate-700 mb-2">
              <a href="https://chartersunion.com/certified-business-accountant" target="_blank" rel="noreferrer" className="text-[#b01b2e]">CBA™</a>
              <span className="text-slate-300 mx-2">|</span>
              <a href="https://chartersunion.com/digital-growth-&-marketing" target="_blank" rel="noreferrer" className="text-[#b01b2e]">DGM™</a>
              <span className="text-slate-300 mx-2">|</span>
              <a href="https://chartersunion.com/technology-&-business-management" target="_blank" rel="noreferrer" className="text-[#b01b2e]">TBM™</a>
            </div>
            <div className="text-xs text-slate-500 mb-3">
              <a href="https://chartersunion.com/careers" target="_blank" rel="noreferrer" className="text-[#b01b2e] underline">Placement &amp; Careers</a>
              <span className="text-slate-300 mx-2">|</span>
              <a href="https://chartersunion.com/apply" target="_blank" rel="noreferrer" className="text-[#b01b2e] underline">Apply Now</a>
            </div>
            <div className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-200 mb-2">
              Your career deserves a real start. Join Charters Union and build it.
            </div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              Copyright © 2026 Charters' Union. All Rights Reserved.
              <span className="text-slate-300 mx-1">|</span>
              <a href="https://chartersunion.com/privacy-policy" target="_blank" rel="noreferrer" className="text-slate-400 underline">Privacy Policy</a>
              <span className="text-slate-300 mx-1">|</span>
              <a href="https://chartersunion.com/terms-and-conditions" target="_blank" rel="noreferrer" className="text-slate-400 underline">Terms &amp; Conditions</a>
              <span className="text-slate-300 mx-1">|</span>
              <a href="https://chartersunion.com/privacy-policy" target="_blank" rel="noreferrer" className="text-slate-400 underline">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PreviewModal({ item, type, onClose, onAction, onSaveEdited, busy }) {
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState("visual"); // "visual" or "raw"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      {/* Large Responsive Modal Box - Prevents Button Cut-off */}
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#0b101b] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 my-auto">
        
        {/* Sticky Header with Unclipped Buttons */}
        <div className="sticky top-0 z-20 bg-[#0e1420] px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Badges + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-200 flex-shrink-0">
              {type}
            </span>
            <StatusPill status={item.status || "pending"} />
            <h2 className="text-sm sm:text-base font-semibold truncate text-white" title={title}>
              {title}
            </h2>
          </div>

          {/* Right: Toggle + Edit + Close Buttons (Flex Shrink 0 to never get cut) */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {!isEditing && (
              <div className="flex rounded-lg bg-slate-800/90 p-1 border border-slate-700/80 text-[10px] font-bold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setViewMode("visual")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    viewMode === "visual" ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Visual UI
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("raw")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    viewMode === "raw" ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Raw Fields
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsEditing((prev) => !prev)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-200 hover:bg-slate-700 transition flex-shrink-0"
            >
              {isEditing ? "View" : "Edit"}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition flex-shrink-0 text-base"
              title="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              {getEditableFields(type).map((field) => (
                <label key={field.key} className="block">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                    {field.label}
                  </span>
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
                  className="px-3.5 py-2 rounded-lg border border-slate-600 bg-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdited}
                  className="px-4 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/20 text-[10px] font-bold uppercase tracking-widest text-emerald-300 hover:bg-emerald-500/30"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <>
              {viewMode === "visual" && (
                <>
                  {type === "whatsapp" && (
                    <WhatsAppVisualPreview message={item.whatsappMessage} headline={item.headline} />
                  )}
                  {type === "email" && <EmailVisualPreview item={item} />}
                  {type === "blog" && (
                    <div className="prose prose-invert max-w-none text-sm text-slate-200 leading-relaxed bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                      <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-xs text-sky-400 mb-4">{item.category} | {item.readingTime || "4 min read"}</p>
                      <div className="whitespace-pre-wrap">{item.content}</div>
                    </div>
                  )}
                </>
              )}

              {viewMode === "raw" && (
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
            </>
          )}
        </div>

        {/* Sticky Footer Action Bar */}
        {!isEditing && (
          <div className="sticky bottom-0 bg-[#0e1420] px-6 py-4 border-t border-white/10 flex flex-wrap gap-2.5 justify-end">
            <ActionButtons item={item} onAction={onAction} busy={busy} />
          </div>
        )}
      </div>
    </div>
  );
}

export function ActionButtons({ item, onAction, busy }) {
  const status = item.status || "pending";

  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400">
        ✓ Published
      </span>
    );
  }

  if (status === "approved") {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAction(item, "rejected")}
          disabled={busy}
          className="px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition"
        >
          Reject
        </button>
        <button
          onClick={() => onAction(item, "published")}
          disabled={busy}
          className="px-5 py-2 rounded-lg bg-sky-600 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50 transition shadow-lg shadow-sky-900/30"
        >
          Publish Now 🚀
        </button>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <button
        onClick={() => onAction(item, "approved")}
        disabled={busy}
        className="px-5 py-2 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-lg shadow-emerald-900/30"
      >
        Re-Approve
      </button>
    );
  }

  // Default: Pending status
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onAction(item, "rejected")}
        disabled={busy}
        className="px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition"
      >
        Reject
      </button>
      <button
        onClick={() => onAction(item, "approved")}
        disabled={busy}
        className="px-5 py-2 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-lg shadow-emerald-900/30"
      >
        Approve & Sync
      </button>
    </div>
  );
}
