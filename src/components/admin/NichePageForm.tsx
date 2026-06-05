"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  slug: string;
  title: string;
  h1: string;
  intent: "buy" | "sell";
  geo: string;
  hero_copy: string;
  meta_desc: string;
  og_image: string;
  filters_min_price: string;
  filters_max_price: string;
  filters_beds: string;
  active: boolean;
};

type Props = {
  mode: "create" | "edit";
  initial?: Partial<FormState>;
  slug?: string; // present in edit mode
};

const EMPTY: FormState = {
  slug: "",
  title: "",
  h1: "",
  intent: "buy",
  geo: "",
  hero_copy: "",
  meta_desc: "",
  og_image: "",
  filters_min_price: "",
  filters_max_price: "",
  filters_beds: "",
  active: true,
};

export function NichePageForm({ mode, initial, slug: editSlug }: Props) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({ ...EMPTY, ...initial });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function buildPayload() {
    const filters: Record<string, number> = {};
    const minP = parseInt(state.filters_min_price, 10);
    const maxP = parseInt(state.filters_max_price, 10);
    const beds = parseInt(state.filters_beds, 10);
    if (!Number.isNaN(minP)) filters.minPrice = minP;
    if (!Number.isNaN(maxP)) filters.maxPrice = maxP;
    if (!Number.isNaN(beds)) filters.beds = beds;
    return {
      slug: state.slug.trim().toLowerCase(),
      title: state.title.trim(),
      h1: state.h1.trim(),
      intent: state.intent,
      geo: state.geo.trim() || null,
      hero_copy: state.hero_copy.trim() || null,
      meta_desc: state.meta_desc.trim() || null,
      og_image: state.og_image.trim() || null,
      filters: Object.keys(filters).length > 0 ? filters : null,
      active: state.active,
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
          ? "/api/admin/pages"
          : `/api/admin/pages/${editSlug}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body =
        mode === "create"
          ? payload
          : (() => {
              // omit slug from PATCH body (slug is the PK; can't change here)
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
      router.push("/admin/pages");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!editSlug) return;
    if (!confirm(`Delete /search/${editSlug}? This cannot be undone.`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/pages/${editSlug}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Delete failed (${res.status})`);
      }
      router.push("/admin/pages");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Row label="Slug (URL: /search/<slug>)">
        <input
          type="text"
          value={state.slug}
          onChange={(e) => update("slug", e.target.value)}
          required
          disabled={mode === "edit"}
          placeholder="germantown-homes-under-400k"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          className="field"
        />
      </Row>

      <Row label="Intent">
        <select
          value={state.intent}
          onChange={(e) => update("intent", e.target.value as "buy" | "sell")}
          className="field"
        >
          <option value="buy">Buy (CTA opens SearchGate → exsell)</option>
          <option value="sell">Sell (CTA goes to /home-value)</option>
        </select>
      </Row>

      <Row label="Title (HTML title + OG)">
        <input
          type="text"
          value={state.title}
          onChange={(e) => update("title", e.target.value)}
          required
          maxLength={120}
          className="field"
        />
      </Row>

      <Row label="H1 (visible hero heading)">
        <input
          type="text"
          value={state.h1}
          onChange={(e) => update("h1", e.target.value)}
          required
          maxLength={120}
          className="field"
        />
      </Row>

      <Row label="Eyebrow / Geo (optional)">
        <input
          type="text"
          value={state.geo}
          onChange={(e) => update("geo", e.target.value)}
          maxLength={80}
          placeholder="Germantown, WI"
          className="field"
        />
      </Row>

      <Row label="Hero copy (paragraph below H1)">
        <textarea
          value={state.hero_copy}
          onChange={(e) => update("hero_copy", e.target.value)}
          rows={4}
          maxLength={2000}
          className="field"
        />
      </Row>

      <Row label="Meta description (SEO snippet)">
        <textarea
          value={state.meta_desc}
          onChange={(e) => update("meta_desc", e.target.value)}
          rows={2}
          maxLength={300}
          className="field"
        />
      </Row>

      <Row label="OG image URL (optional)">
        <input
          type="url"
          value={state.og_image}
          onChange={(e) => update("og_image", e.target.value)}
          placeholder="https://anthonystolp.com/og/germantown.png"
          className="field"
        />
      </Row>

      <fieldset className="grid grid-cols-3 gap-4">
        <legend className="col-span-3 mb-2 text-[11px] uppercase tracking-[0.28em] text-ink-soft/60">
          Filters (optional metadata, used in future search wiring)
        </legend>
        <Row label="Min price ($)">
          <input
            type="number"
            min="0"
            value={state.filters_min_price}
            onChange={(e) => update("filters_min_price", e.target.value)}
            className="field"
          />
        </Row>
        <Row label="Max price ($)">
          <input
            type="number"
            min="0"
            value={state.filters_max_price}
            onChange={(e) => update("filters_max_price", e.target.value)}
            className="field"
          />
        </Row>
        <Row label="Beds (min)">
          <input
            type="number"
            min="0"
            value={state.filters_beds}
            onChange={(e) => update("filters_beds", e.target.value)}
            className="field"
          />
        </Row>
      </fieldset>

      <label className="flex items-center gap-3 text-[13px] text-ink">
        <input
          type="checkbox"
          checked={state.active}
          onChange={(e) => update("active", e.target.checked)}
          className="h-4 w-4 accent-ink"
        />
        Active (published; visitors can reach /search/{state.slug || "<slug>"})
      </label>

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
              ? "Create page"
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
