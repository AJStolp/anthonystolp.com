import { z } from "zod";
import { getSupabase } from "./supabase-server";

export const NicheIntent = z.enum(["buy", "sell"]);
export type NicheIntent = z.infer<typeof NicheIntent>;

export const NicheFilters = z
  .object({
    minPrice: z.number().int().nonnegative().optional(),
    maxPrice: z.number().int().nonnegative().optional(),
    beds: z.number().int().nonnegative().optional(),
    baths: z.number().nonnegative().optional(),
    propertyType: z.string().optional(),
  })
  .strict()
  .partial();
export type NicheFilters = z.infer<typeof NicheFilters>;

// Slug must be URL-safe and stable; lowercase letters, digits, hyphens.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const NichePageInput = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(SLUG_RE, "lowercase letters, digits, and hyphens only"),
  title: z.string().min(1).max(120),
  h1: z.string().min(1).max(120),
  intent: NicheIntent,
  geo: z.string().max(80).nullable().optional(),
  filters: NicheFilters.nullable().optional(),
  hero_copy: z.string().max(2000).nullable().optional(),
  og_image: z.string().url().nullable().optional(),
  meta_desc: z.string().max(300).nullable().optional(),
  active: z.boolean().optional(),
});
export type NichePageInput = z.infer<typeof NichePageInput>;

export const NichePageUpdate = NichePageInput.partial().omit({ slug: true });
export type NichePageUpdate = z.infer<typeof NichePageUpdate>;

export type NichePageRow = {
  slug: string;
  title: string;
  h1: string;
  intent: NicheIntent;
  geo: string | null;
  filters: NicheFilters | null;
  hero_copy: string | null;
  og_image: string | null;
  meta_desc: string | null;
  active: boolean;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT = "slug,title,h1,intent,geo,filters,hero_copy,og_image,meta_desc,active,agent_id,created_at,updated_at";

// Defensive helper: at build time on Vercel, Supabase env vars may be missing
// (e.g. preview deploys without DB access). Build-time SSG pages call these
// functions; rather than failing the entire build, return empty results and
// let runtime pick up the real data once env is wired.
function trySupabase(): ReturnType<typeof getSupabase> | null {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

export async function getActiveSlugs(): Promise<string[]> {
  const supabase = trySupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("niche_pages")
    .select("slug")
    .eq("active", true);
  if (error || !data) return [];
  return data.map((r) => r.slug as string);
}

// Lightweight directory of active pages for internal cross-linking.
export type NicheDirEntry = { slug: string; geo: string | null; intent: NicheIntent };

export async function getActiveDirectory(): Promise<NicheDirEntry[]> {
  const supabase = trySupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("niche_pages")
    .select("slug,geo,intent")
    .eq("active", true);
  if (error || !data) return [];
  return data as NicheDirEntry[];
}

export async function getActiveBySlug(
  slug: string,
): Promise<NichePageRow | null> {
  const supabase = trySupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("niche_pages")
    .select(SELECT)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as NichePageRow;
}

export async function getBySlug(slug: string): Promise<NichePageRow | null> {
  const supabase = trySupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("niche_pages")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as NichePageRow;
}

export async function listAll(): Promise<NichePageRow[]> {
  const supabase = trySupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("niche_pages")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as NichePageRow[];
}

export async function createPage(input: NichePageInput): Promise<NichePageRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("niche_pages")
    .insert({
      slug: input.slug,
      title: input.title,
      h1: input.h1,
      intent: input.intent,
      geo: input.geo ?? null,
      filters: input.filters ?? null,
      hero_copy: input.hero_copy ?? null,
      og_image: input.og_image ?? null,
      meta_desc: input.meta_desc ?? null,
      active: input.active ?? true,
      agent_id: process.env.DEFAULT_AGENT_ID ?? null,
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as NichePageRow;
}

export async function updatePage(
  slug: string,
  patch: NichePageUpdate,
): Promise<NichePageRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("niche_pages")
    .update(patch)
    .eq("slug", slug)
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as NichePageRow;
}

export async function deletePage(slug: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("niche_pages").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
}
