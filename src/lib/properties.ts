import { z } from "zod";
import { getSupabase } from "./supabase-server";

// Slug must be URL-safe and stable; lowercase letters, digits, hyphens.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PropertyStatus = z.enum(["coming_soon", "active", "closed"]);
export type PropertyStatus = z.infer<typeof PropertyStatus>;

export const PropertyInput = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(SLUG_RE, "lowercase letters, digits, and hyphens only"),
  status: PropertyStatus.optional(),
  address: z.string().min(1).max(200),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  postal_code: z.string().max(20).nullable().optional(),
  price: z.number().int().nonnegative().nullable().optional(),
  beds: z.number().nonnegative().nullable().optional(),
  baths: z.number().nonnegative().nullable().optional(),
  sqft: z.number().int().nonnegative().nullable().optional(),
  description: z.string().max(20000).nullable().optional(),
  photo_url: z.string().max(2048).nullable().optional(),
  // ISO-8601 timestamp strings, e.g. "2026-08-01T15:00:00Z". open_house_at is
  // the start; open_house_end is optional and renders a range.
  open_house_at: z.string().max(40).nullable().optional(),
  open_house_end: z.string().max(40).nullable().optional(),
  // Optional lender slot — renders on the page only when populated.
  lender_name: z.string().max(160).nullable().optional(),
  lender_photo_url: z.string().max(2048).nullable().optional(),
  lender_contact: z.string().max(200).nullable().optional(),
});
export type PropertyInput = z.infer<typeof PropertyInput>;

export const PropertyUpdate = PropertyInput.partial().omit({ slug: true });
export type PropertyUpdate = z.infer<typeof PropertyUpdate>;

export type PropertyRow = {
  slug: string;
  status: PropertyStatus;
  address: string;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  description: string | null;
  photo_url: string | null;
  open_house_at: string | null;
  open_house_end: string | null;
  lender_name: string | null;
  lender_photo_url: string | null;
  lender_contact: string | null;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT =
  "slug,status,address,city,state,postal_code,price,beds,baths,sqft,description,photo_url,open_house_at,open_house_end,lender_name,lender_photo_url,lender_contact,agent_id,created_at,updated_at";

// Publicly viewable statuses (closed listings drop off the site).
const PUBLIC_STATUSES = ["coming_soon", "active"];

// Defensive helper: at build time on Vercel, Supabase env vars may be missing
// (e.g. preview deploys without DB access). SSG pages call these functions;
// rather than fail the build, return empty results and let runtime pick up
// real data once env is wired.
function trySupabase(): ReturnType<typeof getSupabase> | null {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

export async function getPublicSlugs(): Promise<string[]> {
  const supabase = trySupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("properties")
    .select("slug")
    .in("status", PUBLIC_STATUSES);
  if (error || !data) return [];
  return data.map((r) => r.slug as string);
}

export async function getPublicBySlug(
  slug: string,
): Promise<PropertyRow | null> {
  const supabase = trySupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("properties")
    .select(SELECT)
    .eq("slug", slug)
    .in("status", PUBLIC_STATUSES)
    .maybeSingle();
  if (error || !data) return null;
  return data as PropertyRow;
}

export async function getBySlug(slug: string): Promise<PropertyRow | null> {
  const supabase = trySupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("properties")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as PropertyRow;
}

export async function listAll(): Promise<PropertyRow[]> {
  const supabase = trySupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("properties")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as PropertyRow[];
}

export async function createProperty(
  input: PropertyInput,
): Promise<PropertyRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      slug: input.slug,
      status: input.status ?? "coming_soon",
      address: input.address,
      city: input.city ?? null,
      state: input.state ?? null,
      postal_code: input.postal_code ?? null,
      price: input.price ?? null,
      beds: input.beds ?? null,
      baths: input.baths ?? null,
      sqft: input.sqft ?? null,
      description: input.description ?? null,
      photo_url: input.photo_url ?? null,
      open_house_at: input.open_house_at ?? null,
      open_house_end: input.open_house_end ?? null,
      lender_name: input.lender_name ?? null,
      lender_photo_url: input.lender_photo_url ?? null,
      lender_contact: input.lender_contact ?? null,
      agent_id: process.env.DEFAULT_AGENT_ID ?? null,
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as PropertyRow;
}

export async function updateProperty(
  slug: string,
  patch: PropertyUpdate,
): Promise<PropertyRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("properties")
    .update(patch)
    .eq("slug", slug)
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as PropertyRow;
}

export async function deleteProperty(slug: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("properties").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
}
