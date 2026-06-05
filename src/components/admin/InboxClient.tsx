"use client";

import { useEffect, useState } from "react";

export type LeadRow = {
  id: string;
  source: string;
  funnel_step: string;
  status: "new" | "contacted" | "working" | "won" | "lost";
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  timeframe: string | null;
  intent: string | null;
  message: string | null;
  notes: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  ai_draft: string | null;
  created_at: string;
  status_changed_at: string | null;
};

const STATUSES: LeadRow["status"][] = [
  "new",
  "contacted",
  "working",
  "won",
  "lost",
];

const SOURCE_LABEL: Record<string, string> = {
  "contact-form": "Contact",
  "home-value": "Home Value",
  "search-redirect": "Search",
};

const TIMEFRAME_LABEL: Record<string, string> = {
  "1-3mo": "1-3 mo",
  "3-6mo": "3-6 mo",
  "6-12mo": "6-12 mo",
  curious: "Curious",
  refinancing: "Refi",
};

export function InboxClient({ initialLeads }: { initialLeads: LeadRow[] }) {
  const [leads, setLeads] = useState(initialLeads);
  useEffect(() => setLeads(initialLeads), [initialLeads]);

  const onChange = (id: string, patch: Partial<LeadRow>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const onDelete = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <ul className="space-y-4">
      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          onChange={onChange}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function LeadCard({
  lead,
  onChange,
  onDelete,
}: {
  lead: LeadRow;
  onChange: (id: string, patch: Partial<LeadRow>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(lead.notes ?? "");
  const [statusSaving, setStatusSaving] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const onDeleteClick = async () => {
    const label = lead.name ?? lead.email ?? "this lead";
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Delete failed (${res.status})`);
      }
      onDelete(lead.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  };

  const save = async (patch: { status?: LeadRow["status"]; notes?: string }) => {
    const res = await fetch(`/api/admin/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("Save failed");
    return res.json() as Promise<{ lead: LeadRow }>;
  };

  const onStatus = async (next: LeadRow["status"]) => {
    if (next === lead.status) return;
    setStatusSaving(true);
    try {
      await save({ status: next });
      onChange(lead.id, { status: next, status_changed_at: new Date().toISOString() });
    } finally {
      setStatusSaving(false);
    }
  };

  const onNotesBlur = async () => {
    if (notesDraft === (lead.notes ?? "")) return;
    setNotesSaving(true);
    try {
      await save({ notes: notesDraft });
      onChange(lead.id, { notes: notesDraft });
    } finally {
      setNotesSaving(false);
    }
  };

  const created = new Date(lead.created_at);
  const relative = relativeTime(created);

  return (
    <li className="border border-ink/10 bg-cream-deep/30 p-5 md:p-6">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="grid w-full grid-cols-1 gap-4 text-left md:grid-cols-12 md:items-center"
        aria-expanded={expanded}
      >
        <div className="md:col-span-4">
          <p className="font-display text-lg font-semibold tracking-[-0.01em] text-ink">
            {lead.name ?? "(no name yet)"}
          </p>
          <p className="text-[12px] text-ink-soft/70">
            {lead.email ?? "—"}
            {lead.phone ? `  ·  ${lead.phone}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:col-span-5">
          <Pill>{SOURCE_LABEL[lead.source] ?? lead.source}</Pill>
          {lead.timeframe && (
            <Pill>{TIMEFRAME_LABEL[lead.timeframe] ?? lead.timeframe}</Pill>
          )}
          {lead.address && (
            <span className="truncate text-[12px] text-ink-soft/70">
              {lead.address}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 md:col-span-3 md:justify-end">
          <span className="text-[11px] uppercase tracking-[0.2em] text-ink-soft/55">
            {relative}
          </span>
        </div>
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-4">
        <label className="text-[11px] uppercase tracking-[0.24em] text-ink-soft/60">
          Status
        </label>
        <select
          value={lead.status}
          disabled={statusSaving}
          onChange={(e) => onStatus(e.target.value as LeadRow["status"])}
          className="border border-ink/20 bg-cream px-3 py-2 text-sm uppercase tracking-[0.16em] text-ink focus-visible:border-ink"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {statusSaving && (
          <span className="text-[11px] text-ink-soft/55">Saving...</span>
        )}
        {lead.ai_draft && !expanded && (
          <span className="ml-auto text-[11px] uppercase tracking-[0.2em] text-accent">
            AI draft ready
          </span>
        )}
      </div>

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-ink/10 pt-5">
          {lead.message && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-ink-soft/60">
                Their message
              </p>
              <p className="mt-2 whitespace-pre-wrap border-l-2 border-ink/15 pl-3 text-[14px] leading-[1.7] text-ink-soft">
                {lead.message}
              </p>
            </div>
          )}

          {lead.ai_draft && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-accent">
                AI-drafted reply
              </p>
              <p className="mt-2 whitespace-pre-wrap border-l-2 border-accent/40 bg-accent/5 p-3 text-[14px] leading-[1.7] text-ink">
                {lead.ai_draft}
              </p>
              {lead.email && (
                <a
                  href={`mailto:${lead.email}?subject=${encodeURIComponent("Re: your inquiry")}&body=${encodeURIComponent(lead.ai_draft)}`}
                  className="mt-3 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-ink underline-offset-4 hover:underline"
                >
                  Open in mail →
                </a>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor={`notes-${lead.id}`}
              className="block text-[11px] uppercase tracking-[0.24em] text-ink-soft/60"
            >
              Notes
            </label>
            <textarea
              id={`notes-${lead.id}`}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={onNotesBlur}
              rows={3}
              placeholder="Anything you want to remember about this lead..."
              className="mt-2 w-full resize-y border border-ink/15 bg-cream p-3 text-[14px] text-ink outline-none placeholder:text-ink/30 focus-visible:border-ink"
            />
            {notesSaving && (
              <p className="mt-1 text-[11px] text-ink-soft/55">Saving...</p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-y-2 text-[12px] text-ink-soft/70 md:grid-cols-4">
            {lead.intent && (
              <Meta label="Intent">{lead.intent}</Meta>
            )}
            {lead.utm_source && (
              <Meta label="UTM source">{lead.utm_source}</Meta>
            )}
            {lead.utm_campaign && (
              <Meta label="UTM campaign">{lead.utm_campaign}</Meta>
            )}
            <Meta label="Submitted">{created.toLocaleString()}</Meta>
          </dl>

          <div className="flex items-center justify-end gap-3 border-t border-ink/10 pt-4">
            {deleteError ? (
              <span className="text-[11px] text-accent">{deleteError}</span>
            ) : null}
            <button
              type="button"
              onClick={onDeleteClick}
              disabled={deleting}
              aria-label={`Delete lead for ${lead.name ?? lead.email ?? "this entry"}`}
              className="text-[11px] uppercase tracking-[0.24em] text-accent/80 underline-offset-4 hover:underline disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete lead"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center border border-ink/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-ink-soft">
      {children}
    </span>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.2em] text-ink-soft/55">
        {label}
      </dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function relativeTime(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}
