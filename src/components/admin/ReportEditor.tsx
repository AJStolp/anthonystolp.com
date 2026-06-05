"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReportShape = {
  id: string;
  zip: string;
  month: string;
  subject: string;
  body_text: string;
  body_html: string;
  status: string;
  draft_score: number | null;
  review_notes: string | null;
  sent_to_count: number;
};

export function ReportEditor({ report }: { report: ReportShape }) {
  const router = useRouter();
  const [subject, setSubject] = useState(report.subject);
  const [bodyText, setBodyText] = useState(report.body_text);
  const [bodyHtml, setBodyHtml] = useState(report.body_html);
  const [status, setStatus] = useState(report.status);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"text" | "html" | "review">("text");

  const isSent = status === "sent";
  const dirty =
    subject !== report.subject ||
    bodyText !== report.body_text ||
    bodyHtml !== report.body_html;

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body_text: bodyText,
          body_html: bodyHtml,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Save failed (${res.status})`);
      }
      setMessage("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function markReady() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Save failed (${res.status})`);
      }
      setStatus("ready");
      setMessage("Marked ready.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function send() {
    if (
      !confirm(
        `Send this report to all subscribers for zip ${report.zip}? This cannot be undone.`,
      )
    )
      return;
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/reports/${report.id}/send`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        sent?: number;
        recipients?: number;
        errors?: string[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `Send failed (${res.status})`);
      }
      setMessage(
        `Sent to ${data.sent} of ${data.recipients} subscribers${data.errors && data.errors.length > 0 ? ` (${data.errors.length} errors)` : ""}.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function deleteReport() {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Delete failed (${res.status})`);
      }
      router.push("/admin/reports");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 border border-ink/10 bg-cream p-4 text-[12px] text-ink-soft md:grid-cols-4">
        <Meta label="Zip">{report.zip}</Meta>
        <Meta label="Month">{report.month.slice(0, 7)}</Meta>
        <Meta label="Status">{status}</Meta>
        <Meta label="Self-review">{report.draft_score ?? "—"}</Meta>
      </div>

      {report.review_notes ? (
        <details className="border border-ink/10 bg-cream p-4 text-[13px] text-ink-soft">
          <summary className="cursor-pointer text-[11px] uppercase tracking-[0.28em] text-ink-soft/70">
            Self-review notes
          </summary>
          <p className="mt-3 whitespace-pre-wrap leading-[1.6]">
            {report.review_notes}
          </p>
        </details>
      ) : null}

      <div>
        <label className="block text-[11px] uppercase tracking-[0.28em] text-ink-soft/60">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={isSent}
          className="mt-2 w-full border-0 border-b border-ink/20 bg-transparent py-2 text-base text-ink outline-none focus-visible:border-ink"
        />
      </div>

      <div>
        <div className="flex gap-4 border-b border-ink/15">
          <Tab active={tab === "text"} onClick={() => setTab("text")}>
            Plain text
          </Tab>
          <Tab active={tab === "html"} onClick={() => setTab("html")}>
            HTML
          </Tab>
          <Tab active={tab === "review"} onClick={() => setTab("review")}>
            Preview
          </Tab>
        </div>
        <div className="mt-4">
          {tab === "text" ? (
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              disabled={isSent}
              rows={20}
              className="w-full border border-ink/15 bg-cream p-4 font-mono text-[13px] leading-[1.6] text-ink outline-none focus-visible:border-ink"
            />
          ) : tab === "html" ? (
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              disabled={isSent}
              rows={20}
              className="w-full border border-ink/15 bg-cream p-4 font-mono text-[12px] leading-[1.5] text-ink outline-none focus-visible:border-ink"
            />
          ) : (
            <div
              className="border border-ink/15 bg-white p-6 text-[14px] leading-[1.65] text-ink"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}
        </div>
        <p className="mt-2 text-[11px] text-ink-soft/55">
          Use the literal token <code>{`{{first_name}}`}</code> where the
          subscriber&apos;s first name should appear. The send pipeline
          substitutes it per recipient.
        </p>
      </div>

      {message ? (
        <p className="text-[12px] text-accent-soft">{message}</p>
      ) : null}
      {error ? <p className="text-[12px] text-accent">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3 pt-4">
        <button
          type="button"
          onClick={save}
          disabled={saving || sending || !dirty || isSent}
          className="border border-ink/40 px-5 py-2.5 text-[11px] uppercase tracking-[0.28em] text-ink hover:bg-ink hover:text-cream disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {status === "draft" ? (
          <button
            type="button"
            onClick={markReady}
            disabled={saving || sending || dirty}
            className="border border-ink/40 px-5 py-2.5 text-[11px] uppercase tracking-[0.28em] text-ink hover:bg-ink hover:text-cream disabled:opacity-50"
          >
            Mark ready
          </button>
        ) : null}
        <button
          type="button"
          onClick={send}
          disabled={sending || dirty || isSent || status !== "ready"}
          className="border border-ink bg-ink px-5 py-2.5 text-[11px] uppercase tracking-[0.28em] text-cream hover:bg-transparent hover:text-ink disabled:opacity-50"
        >
          {sending ? "Sending…" : `Send to zip ${report.zip}`}
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={deleteReport}
          disabled={saving || sending}
          className="text-[11px] uppercase tracking-[0.24em] text-accent hover:underline disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.28em] text-ink-soft/55">
        {label}
      </p>
      <p className="mt-1 text-[13px] text-ink">{children}</p>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "border-b-2 border-ink pb-2 text-[11px] uppercase tracking-[0.28em] text-ink"
          : "pb-2 text-[11px] uppercase tracking-[0.28em] text-ink-soft/55 hover:text-ink"
      }
    >
      {children}
    </button>
  );
}
