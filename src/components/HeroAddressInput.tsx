"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  searchAddresses,
  isMapboxConfigured,
  type AddressSuggestion,
} from "@/lib/mapbox";
import { captureAttribution } from "@/lib/attribution";
import { getOrCreateVisitorId } from "@/lib/visitor";
import { Honeypot } from "@/components/Honeypot";

const DEBOUNCE_MS = 220;

type Props = {
  // When true, the surrounding hero is dark — restyle non-input affordances
  // (error text, mapbox-offline fallback) so they remain legible.
  onDark?: boolean;
};

export function HeroAddressInput({ onDark = false }: Props) {
  const router = useRouter();
  const inputId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    if (selected && query === selected.placeName) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const results = await searchAddresses(query, ctrl.signal);
        setSuggestions(results);
        setActiveIndex(results.length > 0 ? 0 : -1);
      } catch {
        // Aborted or network error — silent.
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  const pick = (s: AddressSuggestion) => {
    setSelected(s);
    setQuery(s.placeName);
    setSuggestions([]);
    setActiveIndex(-1);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(
        (i) => (i - 1 + suggestions.length) % suggestions.length,
      );
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        pick(suggestions[activeIndex]!);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selected) {
      // No selection — try to pick the top suggestion or bail.
      if (suggestions.length > 0) {
        pick(suggestions[0]!);
        return;
      }
      setError("Pick an address from the list");
      return;
    }
    setSubmitting(true);
    try {
      const attribution = captureAttribution();
      const visitorId = getOrCreateVisitorId();
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "home-value",
          funnelStep: "address-only",
          address: selected.placeName,
          addressLine1: selected.addressLine1,
          city: selected.city,
          state: selected.state,
          postalCode: selected.postalCode,
          lat: selected.lat,
          lng: selected.lng,
          mapboxId: selected.id,
          intent: "sell",
          hp_company: honeypot,
          visitorId,
          ...attribution,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        leadId?: string;
        error?: string;
      };
      const params = new URLSearchParams({
        address: selected.placeName,
        lat: selected.lat.toString(),
        lng: selected.lng.toString(),
      });
      if (data.leadId) params.set("leadId", data.leadId);
      router.push(`/home-value?${params.toString()}`);
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  };

  if (!isMapboxConfigured()) {
    return (
      <div className="mt-8 max-w-xl">
        <p
          className={`text-[12px] ${onDark ? "text-cream/85" : "text-accent"}`}
        >
          Address lookup is offline. Use the home-value form directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 w-full max-w-xl" noValidate>
      <Honeypot value={honeypot} onChange={setHoneypot} />
      <label htmlFor={inputId} className="sr-only">
        Your home address
      </label>
      <div className="relative">
        <div className="flex w-full items-stretch border border-ink/15 bg-white shadow-sm focus-within:border-ink">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            placeholder="Enter your home address"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={open && suggestions.length > 0}
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
            }
            className="flex-1 bg-transparent px-5 py-4 text-base text-ink outline-none placeholder:text-ink-soft/50"
          />
          <button
            type="submit"
            disabled={submitting || !selected}
            className="group inline-flex items-center gap-2 bg-ink px-5 py-4 text-[11px] uppercase tracking-[0.32em] text-cream transition-all hover:bg-cream hover:text-ink md:px-7"
          >
            {submitting ? "…" : "Get estimate"}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </div>

        {open && suggestions.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-auto border border-ink/15 bg-white shadow-md"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                className={`cursor-pointer px-5 py-3 text-sm ${
                  i === activeIndex
                    ? "bg-ink/5 text-ink"
                    : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                }`}
              >
                {s.placeName}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className={`mt-3 text-[12px] tracking-[0.04em] ${
            onDark
              ? "rounded bg-ink/70 px-3 py-1.5 text-cream backdrop-blur-sm"
              : "text-accent"
          }`}
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
