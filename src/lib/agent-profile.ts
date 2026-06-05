// Per-agent profile data. v1 is single-tenant (AJ only) with all values
// hardcoded here. v2 will move this to an `agents` table keyed by agent_id
// so the same code serves multiple agents (Dan's team scale-out).
//
// When multi-tenanting, replace getAgentProfile() with a DB lookup keyed by
// agent_id. Every consumer of this module already passes/derives agent_id
// from the request context, so the swap is local to this file.

export type AgentProfile = {
  agentId: string;
  name: string;                    // "Anthony Stolp"
  shortName: string;               // "Anthony"
  brokerage: string;               // "ExSell Experts at Epique Realty"
  phone: string;                   // "(262) 885-3310"
  websiteDomain: string;           // "anthonystolp.com"
  fromEmail: string;               // Resend sender, verified domain
  replyToEmail: string;            // where replies route
  licenseNumber: string;           // "114204-94"
  licenseState: string;            // "WI"
  serviceArea: string;             // human-readable area
  targetZips: string[];            // zips covered for market reports
  voiceNotes: string;              // brand voice rules for Claude prompts
};

const AJ_PROFILE: AgentProfile = {
  agentId: "5e259344-5cf2-4179-a56b-15e2f69fe1fb",
  name: "Anthony Stolp",
  shortName: "Anthony",
  brokerage: "ExSell Experts at Epique Realty",
  phone: "(262) 885-3310",
  websiteDomain: "anthonystolp.com",
  fromEmail: process.env.LEAD_FROM_EMAIL ?? "hello@anthonystolp.com",
  replyToEmail: process.env.LEAD_TO_EMAIL ?? "anthony@exsellexperts.com",
  licenseNumber: "114204-94",
  licenseState: "WI",
  serviceArea: "Ozaukee County, Wisconsin",
  targetZips: ["53012", "53092", "53097", "53024", "53074", "53080"],
  // Per-agent voice rules for any Claude-drafted content
  voiceNotes: `Calm, honest, no marketing fluff. Direct but warm, conversational, first-person. Write like a person, not a brand. "I" not "we". NEVER use em dashes (use periods or commas instead). No exclamation points except where genuinely natural. Sign off "Talk soon, Anthony" on personal correspondence.`,
};

/**
 * Look up an agent profile by ID. v1 returns AJ for any input (single-tenant).
 * v2 will query an `agents` table.
 */
export function getAgentProfile(agentId?: string | null): AgentProfile {
  // Single-tenant fallback. Multi-tenant version will look up by ID.
  return AJ_PROFILE;
}

export const DEFAULT_AGENT_ID = AJ_PROFILE.agentId;
