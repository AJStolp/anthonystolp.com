import { randomBytes } from "node:crypto";
import { getSupabase } from "./supabase-server";

// URL-safe alphabet with visually ambiguous characters removed (0/O, 1/I/l).
const SLUG_ALPHABET =
  "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const SITE_URL = process.env.SITE_URL ?? "https://anthonystolp.com";
const MAX_INSERT_RETRIES = 5;

function generateSlug(length = 10): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SLUG_ALPHABET[bytes[i]! % SLUG_ALPHABET.length];
  }
  return out;
}

export type LinkTokenKind =
  | "farm"
  | "ad"
  | "card"
  | "open-house"
  | "other";

export type LinkTokenContext = {
  kind: LinkTokenKind;
  farm_target_id?: string;
  niche_slug?: string;
} & Record<string, unknown>;

export type CreateTokenInput = {
  targetUrl: string;
  context?: LinkTokenContext;
  agentId?: string | null;
  expiresAt?: Date | null;
};

export type LinkTokenRow = {
  token: string;
  target_url: string;
  context: LinkTokenContext | null;
  agent_id: string | null;
  expires_at: string | null;
};

export async function createToken(
  input: CreateTokenInput,
): Promise<{ token: string; fullUrl: string }> {
  const supabase = getSupabase();
  for (let attempt = 0; attempt < MAX_INSERT_RETRIES; attempt++) {
    const token = generateSlug(10);
    const { error } = await supabase.from("link_tokens").insert({
      token,
      target_url: input.targetUrl,
      context: input.context ?? null,
      agent_id: input.agentId ?? process.env.DEFAULT_AGENT_ID ?? null,
      expires_at: input.expiresAt?.toISOString() ?? null,
    });
    if (!error) return { token, fullUrl: `${SITE_URL}/n/${token}` };
    if (error.code !== "23505") {
      throw new Error(`createToken failed: ${error.message}`);
    }
  }
  throw new Error("createToken: exhausted slug-collision retries");
}

export async function resolveToken(token: string): Promise<LinkTokenRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("link_tokens")
    .select("token, target_url, context, agent_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return data as LinkTokenRow;
}

export async function bumpHit(token: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.rpc("bump_link_token_hit", { p_token: token });
}
