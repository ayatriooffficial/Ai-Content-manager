import React, { useEffect, useMemo, useState } from "react";
import StatusPill from "./StatusPill";
import { approveCalendarSlot, rejectCalendarSlot, updateCalendarSlotOption } from "../api";

export const CHANNEL_META = {
  WEBSITE: { icon: "📝", label: "Blog", dot: "bg-sky-400", text: "text-sky-300", ring: "border-sky-400/30 bg-sky-400/10" },
  EMAIL: { icon: "✉️", label: "Email", dot: "bg-violet-400", text: "text-violet-300", ring: "border-violet-400/30 bg-violet-400/10" },
  WHATSAPP: { icon: "💬", label: "WhatsApp", dot: "bg-emerald-400", text: "text-emerald-300", ring: "border-emerald-400/30 bg-emerald-400/10" },
};

const FUNNEL_META = {
  "1_AWARENESS": { label: "Awareness", cls: "bg-amber-400/10 text-amber-300 border-amber-400/20" },
  "2_ENGAGEMENT": { label: "Engagement", cls: "bg-indigo-400/10 text-indigo-300 border-indigo-400/20" },
  "3_CONVERSION": { label: "Conversion", cls: "bg-rose-400/10 text-rose-300 border-rose-400/20" },
};

function parseTimeframeDays(timeframe) {
  const match = /\d+/.exec(timeframe || "");
  return match ? parseInt(match[0], 10) : 15;
}

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

/**
 * Builds a full, contiguous day-by-day rail (Day 1..N) starting from the
 * calendar's createdAt date, filling in empty days that have nothing
 * scheduled so the whole campaign span is visible at a glance — not just
 * the days that happen to have content.
 */
function buildDayRail(calendar) {
  const totalDays = parseTimeframeDays(calendar.timeframe);
  const baseDate = new Date(calendar.createdAt);
  baseDate.setHours(0, 0, 0, 0);

  const byDate = {};
  (calendar.calendarView || []).forEach((day) => {
    byDate[day.date] = day.items;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rail = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    const dateKey = toDateKey(date);

    rail.push({
      dayNumber: i + 1,
      date,
      dateKey,
      isToday: isSameDay(date, today),
      isPast: date < today && !isSameDay(date, today),
      items: (byDate[dateKey] || []).slice().sort((a, b) => a.time.localeCompare(b.time)),
    });
  }
  return rail;
}

function ItemChip({ item, onOpen }) {
  const meta = CHANNEL_META[item.channel] || CHANNEL_META.WEBSITE;
  return (
    <button
      onClick={() => onOpen(item)}
      className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all hover:brightness-125 ${meta.ring}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${meta.text} flex items-center gap-1`}>
          <span>{meta.icon}</span>
          {meta.label}
        </span>
        <span className="text-[10px] font-mono text-slate-400">{item.time}</span>
      </div>
      <p className="text-xs text-slate-100 leading-snug line-clamp-2 font-medium">{item.label || "Untitled"}</p>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {item.funnelStage && FUNNEL_META[item.funnelStage] && (
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${FUNNEL_META[item.funnelStage].cls}`}>
            {FUNNEL_META[item.funnelStage].label}
          </span>
        )}
        <StatusPill status={item.status} />
      </div>
    </button>
  );
}

function hydrateCalendarWithOptions(calendar) {
  if (!calendar) return calendar;

  const schedule = calendar.schedule || {};
  const slotMap = new Map();

  [
    ...(schedule.websiteBlogs || []).map((slot) => ({ ...slot, channel: "WEBSITE" })),
    ...(schedule.emailMessages || []).map((slot) => ({ ...slot, channel: "EMAIL" })),
    ...(schedule.whatsappMessages || []).map((slot) => ({ ...slot, channel: "WHATSAPP" })),
  ].forEach((slot) => {
    if (slot && slot.slotKey) {
      slotMap.set(`${slot.channel}:${slot.slotKey}`, slot);
      slotMap.set(slot.slotKey, slot);
    }
  });

  return {
    ...calendar,
    calendarView: (calendar.calendarView || []).map((day) => ({
      ...day,
      items: (day.items || []).map((item) => {
        const sourceSlot = slotMap.get(`${item.channel}:${item.slotKey}`) || slotMap.get(item.slotKey) || {};
        const options = Array.isArray(item.options) && item.options.length ? item.options : (Array.isArray(sourceSlot.options) ? sourceSlot.options : []);
        const selectedOptionIndex = Number.isInteger(item.selectedOptionIndex)
          ? item.selectedOptionIndex
          : Number.isInteger(sourceSlot.selectedOptionIndex)
            ? sourceSlot.selectedOptionIndex
            : 0;

        return {
          ...item,
          options,
          selectedOptionIndex,
        };
      }),
    })),
  };
}

function getOptionDetailBlocks(option, channel) {
  if (!option || typeof option !== "object") return [];

  if (channel === "WEBSITE") {
    return [
      option.title ? { label: "Title", value: option.title } : null,
      option.primaryKeyword ? { label: "Primary keyword", value: option.primaryKeyword } : null,
      option.coreAngle ? { label: "Core angle", value: option.coreAngle } : null,
      Array.isArray(option.gapKeywords) && option.gapKeywords.length ? { label: "Gap keywords", value: option.gapKeywords.join(", ") } : null,
    ].filter(Boolean);
  }

  if (channel === "EMAIL") {
    return [
      option.subjectLine ? { label: "Subject", value: option.subjectLine } : null,
      option.previewText ? { label: "Preview text", value: option.previewText } : null,
      option.coreAngle ? { label: "Core angle", value: option.coreAngle } : null,
      Array.isArray(option.gapKeywords) && option.gapKeywords.length ? { label: "Gap keywords", value: option.gapKeywords.join(", ") } : null,
    ].filter(Boolean);
  }

  return [
    option.whatsappHook ? { label: "WhatsApp copy", value: option.whatsappHook } : null,
    option.ctaGoal ? { label: "CTA goal", value: option.ctaGoal } : null,
    Array.isArray(option.gapKeywords) && option.gapKeywords.length ? { label: "Gap keywords", value: option.gapKeywords.join(", ") } : null,
  ].filter(Boolean);
}

function getEditableFields(channel) {
  if (channel === "WEBSITE") {
    return [
      { key: "title", label: "Title", type: "text" },
      { key: "primaryKeyword", label: "Primary keyword", type: "text" },
      { key: "coreAngle", label: "Core angle", type: "textarea" },
      { key: "gapKeywords", label: "Gap keywords", type: "text" },
    ];
  }

  if (channel === "EMAIL") {
    return [
      { key: "subjectLine", label: "Subject", type: "text" },
      { key: "previewText", label: "Preview text", type: "textarea" },
      { key: "coreAngle", label: "Core angle", type: "textarea" },
      { key: "gapKeywords", label: "Gap keywords", type: "text" },
    ];
  }

  return [
    { key: "whatsappHook", label: "WhatsApp copy", type: "textarea" },
    { key: "ctaGoal", label: "CTA goal", type: "text" },
    { key: "gapKeywords", label: "Gap keywords", type: "text" },
  ];
}

function normalizeDraftKeywordString(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value == null) return "";
  return String(value);
}

function DetailModal({
  item,
  onClose,
  onAction,
  busy,
  statusMessage,
  selectedOptionIndex,
  setSelectedOptionIndex,
  editingOptionIndex,
  draftOption,
  setDraftOption,
  onStartEditOption,
  onCancelEditOption,
  onSaveEditedOption,
}) {
  if (!item) return null;
  const meta = CHANNEL_META[item.channel] || CHANNEL_META.WEBSITE;
  const optionCount = Array.isArray(item.options) ? item.options.length : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-[#0e1420] border border-white/10 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0e1420] px-6 py-4 border-b border-white/5 flex items-start justify-between gap-4">
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${meta.text} flex items-center gap-1 mb-2`}>
              <span>{meta.icon}</span>
              {meta.label} · {item.time}
            </span>
            <h2 className="text-lg font-bold text-white leading-snug">{item.label}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none shrink-0">
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {item.funnelStage && FUNNEL_META[item.funnelStage] && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${FUNNEL_META[item.funnelStage].cls}`}>
                {FUNNEL_META[item.funnelStage].label}
              </span>
            )}
            <StatusPill status={item.status} />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Slot</p>
            <p className="text-sm text-slate-300 font-mono">{item.slotKey}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Scheduled</p>
            <p className="text-sm text-slate-300">
              {new Date(item.scheduledTimestamp).toLocaleString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {item.status !== "PENDING_ADMIN_APPROVAL" && optionCount > 0 ? (() => {
            const selectedOption = item.options[Math.min(Math.max(Number.isInteger(item.selectedOptionIndex) ? item.selectedOptionIndex : 0, 0), item.options.length - 1)] || item.options[0];
            const detailBlocks = getOptionDetailBlocks(selectedOption, item.channel);
            const selectedTitle = item.channel === "WEBSITE"
              ? selectedOption?.title || item.label
              : item.channel === "EMAIL"
              ? selectedOption?.subjectLine || item.label
              : selectedOption?.whatsappHook || item.label;

            return (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Approved content</p>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-3">
                  <p className="text-xs text-slate-100 leading-snug font-medium mb-2">{selectedTitle}</p>
                  <div className="space-y-1.5 text-left">
                    {detailBlocks.map((block) => (
                      <div key={`${item.slotKey}-selected-${block.label}`} className="border-t border-slate-700/60 pt-1.5 first:border-t-0 first:pt-0">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{block.label}</p>
                        <p className="text-[11px] leading-relaxed text-slate-200">{block.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })() : null}

          {item.status === "PENDING_ADMIN_APPROVAL" && optionCount > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Choose option</p>
              <div className="space-y-2">
                {item.options.map((option, index) => {
                  const isSelected = selectedOptionIndex === index;
                  const detailBlocks = getOptionDetailBlocks(option, item.channel);
                  const title = item.channel === "WEBSITE"
                    ? option.title || item.label
                    : item.channel === "EMAIL"
                    ? option.subjectLine || item.label
                    : option.whatsappHook || item.label;

                  return (
                    <div
                      key={`${item.slotKey}-option-${index}`}
                      className={`rounded-xl border px-3 py-2.5 transition ${
                        isSelected
                          ? "border-sky-400/60 bg-sky-500/10"
                          : "border-slate-700 bg-slate-900/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOptionIndex(index)}
                          className="w-full text-left"
                        >
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Option {index + 1}</span>
                          {isSelected && <span className="ml-2 text-[9px] font-bold uppercase tracking-widest text-sky-300">Selected</span>}
                          <p className="text-xs text-slate-100 leading-snug font-medium mt-1">{title}</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => onStartEditOption(index, option)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800/80 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-200 hover:border-sky-400/60 hover:text-sky-200"
                          title="Edit option"
                        >
                          ✎ Edit
                        </button>
                      </div>

                      {editingOptionIndex === index && (
                        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3 space-y-3">
                          {getEditableFields(item.channel).map((field) => (
                            <label key={`${item.slotKey}-field-${field.key}`} className="block text-left">
                              <span className="block text-[8px] font-bold uppercase tracking-widest text-slate-500 mb-1">{field.label}</span>
                              {field.type === "textarea" ? (
                                <textarea
                                  value={draftOption?.[field.key] ?? ""}
                                  onChange={(e) => setDraftOption((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                  rows={4}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-400/40 focus:outline-none"
                                />
                              ) : (
                                <input
                                  value={draftOption?.[field.key] ?? ""}
                                  onChange={(e) => setDraftOption((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-400/40 focus:outline-none"
                                />
                              )}
                            </label>
                          ))}

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={onCancelEditOption}
                              className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => onSaveEditedOption(index)}
                              className="px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-[10px] font-bold uppercase tracking-widest text-emerald-200"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5 text-left mt-2">
                        {detailBlocks.map((block) => (
                          <div key={`${item.slotKey}-option-${index}-${block.label}`} className="border-t border-slate-700/60 pt-1.5 first:border-t-0 first:pt-0">
                            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{block.label}</p>
                            <p className="text-[11px] leading-relaxed text-slate-200">{block.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {item.status === "PENDING_ADMIN_APPROVAL" ? (
            <div className="flex flex-wrap gap-3 mt-3">
              <button
                disabled={busy}
                onClick={() => onAction(item, "rejected")}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 disabled:opacity-40"
              >
                Reject
              </button>
              <button
                disabled={busy}
                onClick={() => onAction(item, "approved")}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 disabled:opacity-40"
              >
                Approve Selected
              </button>
            </div>
          ) : null}

          {statusMessage ? (
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">
              {statusMessage}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function CalendarTimeline({ calendar }) {
  const [openItem, setOpenItem] = useState(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [currentCalendar, setCurrentCalendar] = useState(calendar);
  const [busyAction, setBusyAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [editingOptionIndex, setEditingOptionIndex] = useState(null);
  const [draftOption, setDraftOption] = useState(null);

  useEffect(() => {
    setCurrentCalendar(hydrateCalendarWithOptions(calendar));
  }, [calendar]);

  useEffect(() => {
    if (!statusMessage) return;
    const timeout = window.setTimeout(() => setStatusMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  useEffect(() => {
    if (!openItem) return;
    setSelectedOptionIndex(openItem.selectedOptionIndex ?? 0);
  }, [openItem]);

  const getSlotChannel = (channel) => {
    if (channel === "WEBSITE") return "blog";
    if (channel === "EMAIL") return "email";
    if (channel === "WHATSAPP") return "whatsapp";
    return "blog";
  };

  const beginEditOption = (index, option) => {
    setEditingOptionIndex(index);
    setDraftOption({
      ...option,
      gapKeywords: normalizeDraftKeywordString(option?.gapKeywords),
    });
  };

  const cancelEditOption = () => {
    setEditingOptionIndex(null);
    setDraftOption(null);
  };

  const saveEditedOption = async (index) => {
    if (!openItem || !currentCalendar?.calendarId) return;
    const normalized = { ...draftOption };
    if (typeof normalized.gapKeywords === "string") {
      normalized.gapKeywords = normalized.gapKeywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    try {
      const updatedCalendar = await updateCalendarSlotOption(
        currentCalendar.calendarId,
        getSlotChannel(openItem.channel),
        openItem.slotKey,
        index,
        normalized,
      );

      setCurrentCalendar(updatedCalendar);
      const updatedItem = (updatedCalendar.calendarView || [])
        .flatMap((day) => day.items || [])
        .find((it) => it.slotKey === openItem.slotKey);

      if (updatedItem) {
        setOpenItem(updatedItem);
        setSelectedOptionIndex(index);
      }
      setEditingOptionIndex(null);
      setDraftOption(null);
      setStatusMessage("Edited option saved and selected.");
    } catch (err) {
      setStatusMessage(err?.response?.data?.error || err?.message || "Could not save edited option.");
    }
  };

  const updateSlotInCalendar = (slotKey, newStatus) => {
    setCurrentCalendar((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        calendarView: (prev.calendarView || []).map((day) => ({
          ...day,
          items: (day.items || []).map((it) => (it.slotKey === slotKey ? { ...it, status: newStatus } : it)),
        })),
      };
    });
  };

  async function handleAction(item, newStatus) {
    if (!item) return;
    if (!currentCalendar?.calendarId) return;

    const channel = getSlotChannel(item.channel);
    const slotKey = item.slotKey;
    const chosenOptionIndex = Array.isArray(item.options) && item.options.length ? selectedOptionIndex : 0;
    if (!slotKey) return;

    setBusyAction(true);
    try {
      const updatedCalendar =
        newStatus === "approved"
          ? await approveCalendarSlot(currentCalendar.calendarId, channel, slotKey, chosenOptionIndex)
          : await rejectCalendarSlot(currentCalendar.calendarId, channel, slotKey);

      setCurrentCalendar(updatedCalendar);
      const updatedItem = (updatedCalendar.calendarView || [])
        .flatMap((day) => day.items || [])
        .find((it) => it.slotKey === slotKey);
      if (updatedItem) {
        setOpenItem(updatedItem);
        setStatusMessage(`Marked as ${updatedItem.status.toLowerCase()}.`);
      } else {
        setOpenItem({ ...item, status: newStatus });
        setStatusMessage(`Marked as ${newStatus}.`);
      }
    } catch (err) {
      setStatusMessage(err?.response?.data?.error || err?.message || "Action failed.");
    } finally {
      setBusyAction(false);
    }
  }

  const rail = useMemo(() => (currentCalendar ? buildDayRail(currentCalendar) : []), [currentCalendar]);

  if (!calendar) return null;

  const filteredRail = rail.map((day) => ({
    ...day,
    items: channelFilter === "ALL" ? day.items : day.items.filter((i) => i.channel === channelFilter),
  }));

  return (
    <div>
      {/* Campaign header */}
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusPill status={calendar.status} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {calendar.timeframe} · {calendar.calendarId}
              </span>
            </div>
            <h3 className="text-xl font-black text-white">{calendar.campaignName}</h3>
            {(calendar.audienceCategory || calendar.targetLocation) && (
              <p className="text-sm text-slate-500 mt-1">
                {[calendar.audienceCategory, calendar.targetLocation].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <SummaryStat label="Blogs" value={calendar.summary?.totalBlogs} icon="📝" />
            <SummaryStat label="Emails" value={calendar.summary?.totalEmails} icon="✉️" />
            <SummaryStat label="WhatsApp" value={calendar.summary?.totalWhatsAppMessages} icon="💬" />
          </div>
        </div>
      </div>

      {/* Channel filter */}
      <div className="flex gap-2 mb-5">
        {["ALL", "WEBSITE", "EMAIL", "WHATSAPP"].map((c) => (
          <button
            key={c}
            onClick={() => setChannelFilter(c)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              channelFilter === c ? "bg-white text-black" : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            {c === "ALL" ? "All Channels" : CHANNEL_META[c].label}
          </button>
        ))}
      </div>

      {/* Day rail */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {filteredRail.map((day) => (
          <div
            key={day.dayNumber}
            className={`shrink-0 w-64 rounded-2xl border p-4 ${
              day.isToday
                ? "border-emerald-400/40 bg-emerald-400/[0.04]"
                : day.isPast
                ? "border-white/5 bg-white/[0.015] opacity-60"
                : "border-white/5 bg-white/[0.03]"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Day {day.dayNumber}
                </p>
                <p className="text-sm font-bold text-white">
                  {day.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </p>
              </div>
              {day.isToday && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
                  Today
                </span>
              )}
            </div>

            <div className="space-y-2">
              {day.items.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-3">Nothing scheduled</p>
              ) : (
                day.items.map((item) => <ItemChip key={item.slotKey} item={item} onOpen={setOpenItem} />)
              )}
            </div>
          </div>
        ))}
      </div>

      <DetailModal
        item={openItem}
        onClose={() => setOpenItem(null)}
        onAction={handleAction}
        busy={busyAction}
        statusMessage={statusMessage}
        selectedOptionIndex={selectedOptionIndex}
        setSelectedOptionIndex={setSelectedOptionIndex}
        editingOptionIndex={editingOptionIndex}
        draftOption={draftOption}
        setDraftOption={setDraftOption}
        onStartEditOption={beginEditOption}
        onCancelEditOption={cancelEditOption}
        onSaveEditedOption={saveEditedOption}
      />
    </div>
  );
}

function SummaryStat({ label, value, icon }) {
  return (
    <div className="text-center">
      <p className="text-lg">{icon}</p>
      <p className="text-lg font-black text-white leading-none mt-1">{value ?? "—"}</p>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
