"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "coming_soon" | "active" | "closed";

type FormState = {
  slug: string;
  status: Status;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  description: string;
  photo_url: string;
  // datetime-local value ("YYYY-MM-DDTHH:mm"), interpreted as the admin's
  // local (Central) time on submit.
  open_house_at: string;
  lender_name: string;
  lender_photo_url: string;
  lender_contact: string;
};

type Props = {
  mode: "create" | "edit";
  initial?: Partial<FormState>;
  slug?: string; // present in edit mode
};

const EMPTY: FormState = {
  slug: "",
  status: "coming_soon",
  address: "",
  city: "",
  state: "WI",
  postal_code: "",
  price: "",
  beds: "",
  baths: "",
  sqft: "",
  description: "",
  photo_url: "",
  open_house_at: "",
  lender_name: "",
  lender_photo_url: "",
  lender_contact: "",
};

function num(v: string): number | null {
  const n = Number(v);
  return v.trim() !== "" && !Number.isNaN(n) ? n : null;
}

export function PropertyForm({ mode, initial, slug: editSlug }: Props) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({ ...EMPTY, ...initial });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function buildPayload() {
    return {
      slug: state.slug.trim().toLowerCase(),
      status: state.status,
      address: state.address.trim(),
      city: state.city.trim() || null,
      state: state.state.trim() || null,
      postal_code: state.postal_code.trim() || null,
      price: num(state.price),
      beds: num(state.beds),
      baths: num(state.baths),
      sqft: num(state.sqft),
      description: state.description.trim() || null,
      photo_url: state.photo_url.trim() || null,
      // datetime-local has no timezone; new Date() reads it as browser-local
      // (Central for the admin), which we store as a UTC instant.
      open_house_at: state.open_house_at
        ? new Date(state.open_house_at).toISOString()
        : null,
      lender_name: state.lender_name.trim() || null,
      lender_photo_url: state.lender_photo_url.trim() || null,
      lender_contact: state.lender_contact.trim() || null,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const url =
        mode === "create"
          ? "/api/admin/properties"
          : `/api/admin/properties/${editSlug}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body =
        mode === "create"
          ? payload
          : (() => {
              const { slug: _slug, ...rest } = payload;
              return rest;
            })();
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      const dest =
        mode === "create" ? `/admin/properties/${payload.slug}` : "/admin/properties";
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!editSlug) return;
    if (!confirm(`Delete /property/${editSlug}? This cannot be undone.`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/properties/${editSlug}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Delete failed (${res.status})`);
      }
      router.push("/admin/properties");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Row label="Slug (URL: /property/<slug>)">
        <input
          type="text"
          value={state.slug}
          onChange={(e) => update("slug", e.target.value)}
          required
          disabled={mode === "edit"}
          placeholder="521-alta-loma"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          className="field"
        />
      </Row>

      <Row label="Status">
        <select
          value={state.status}
          onChange={(e) => update("status", e.target.value as Status)}
          className="field"
        >
          <option value="coming_soon">Coming Soon</option>
          <option value="active">Active</option>
          <option value="closed">Closed (hidden from site)</option>
        </select>
      </Row>

      <Row label="Address">
        <input
          type="text"
          value={state.address}
          onChange={(e) => update("address", e.target.value)}
          required
          maxLength={200}
          placeholder="521 Alta Loma Dr"
          className="field"
        />
      </Row>

      <div className="grid grid-cols-3 gap-4">
        <Row label="City">
          <input
            type="text"
            value={state.city}
            onChange={(e) => update("city", e.target.value)}
            className="field"
          />
        </Row>
        <Row label="State">
          <input
            type="text"
            value={state.state}
            onChange={(e) => update("state", e.target.value)}
            className="field"
          />
        </Row>
        <Row label="ZIP">
          <input
            type="text"
            value={state.postal_code}
            onChange={(e) => update("postal_code", e.target.value)}
            className="field"
          />
        </Row>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Row label="Price ($)">
          <input
            type="number"
            min="0"
            value={state.price}
            onChange={(e) => update("price", e.target.value)}
            className="field"
          />
        </Row>
        <Row label="Beds">
          <input
            type="number"
            min="0"
            step="0.5"
            value={state.beds}
            onChange={(e) => update("beds", e.target.value)}
            className="field"
          />
        </Row>
        <Row label="Baths">
          <input
            type="number"
            min="0"
            step="0.5"
            value={state.baths}
            onChange={(e) => update("baths", e.target.value)}
            className="field"
          />
        </Row>
        <Row label="Sq Ft">
          <input
            type="number"
            min="0"
            value={state.sqft}
            onChange={(e) => update("sqft", e.target.value)}
            className="field"
          />
        </Row>
      </div>

      <Row label="Open house (date + time, Central)">
        <input
          type="datetime-local"
          value={state.open_house_at}
          onChange={(e) => update("open_house_at", e.target.value)}
          className="field"
        />
      </Row>

      <Row label="Hero photo URL (e.g. /properties/521-alta-loma.jpg)">
        <input
          type="text"
          value={state.photo_url}
          onChange={(e) => update("photo_url", e.target.value)}
          placeholder="/properties/<slug>.jpg"
          className="field"
        />
      </Row>

      <Row label="Description (blank line between paragraphs)">
        <textarea
          value={state.description}
          onChange={(e) => update("description", e.target.value)}
          rows={8}
          maxLength={20000}
          className="field"
        />
      </Row>

      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <legend className="col-span-full mb-2 text-[11px] uppercase tracking-[0.28em] text-ink-soft/60">
          Lender (optional) — shows a financing partner card on the page
        </legend>
        <Row label="Lender name">
          <input
            type="text"
            value={state.lender_name}
            onChange={(e) => update("lender_name", e.target.value)}
            className="field"
          />
        </Row>
        <Row label="Lender photo URL">
          <input
            type="text"
            value={state.lender_photo_url}
            onChange={(e) => update("lender_photo_url", e.target.value)}
            className="field"
          />
        </Row>
        <Row label="Lender contact">
          <input
            type="text"
            value={state.lender_contact}
            onChange={(e) => update("lender_contact", e.target.value)}
            className="field"
          />
        </Row>
      </fieldset>

      {error ? (
        <p role="alert" className="text-[12px] text-accent">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="border border-ink bg-ink px-6 py-3 text-[11px] uppercase tracking-[0.32em] text-cream hover:bg-transparent hover:text-ink disabled:opacity-50"
        >
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Create property"
              : "Save changes"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={submitting}
            className="text-[11px] uppercase tracking-[0.28em] text-accent hover:underline disabled:opacity-50"
          >
            Delete
          </button>
        ) : null}
      </div>

      <style jsx>{`
        :global(.field) {
          display: block;
          width: 100%;
          background: transparent;
          border: 0;
          border-bottom: 1px solid rgb(26 28 28 / 0.2);
          padding: 0.625rem 0;
          font-size: 1rem;
          color: rgb(26 28 28);
          outline: none;
        }
        :global(.field:focus-visible) {
          border-color: rgb(26 28 28);
        }
      `}</style>
    </form>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.28em] text-ink-soft/60">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
