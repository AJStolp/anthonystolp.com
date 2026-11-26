import { getAgentProfile } from "@/lib/agent-profile";

// The Northwoods page (/northwoods), Marinette County: Anthony and his cousin
// Jay, working it together. The printed Marinette County flyers name both of
// them, so this page does too, and every lead it produces copies Jay. Every
// other page on the site has one contact, Anthony.

export type TeamMember = {
  name: string;
  title: string;
  phone: string;
  email: string;
  photo: string;
};

const JAY_EMAIL = "jaystolp@exsellexperts.com";

export const NORTHWOODS_TEAM: TeamMember[] = [
  {
    name: "Anthony Stolp",
    title: "REALTOR®",
    phone: getAgentProfile().mobilePhone,
    email: "anthony@exsellexperts.com",
    photo: "/images/anthony-headshot.png",
  },
  {
    name: "Jay Stolp",
    title: "REALTOR®",
    phone: "(414) 807-2478",
    email: JAY_EMAIL,
    photo: "/images/northwoods/jay-headshot.png",
  },
];

// Lead sources the page sends. Kept apart from the site's own so the inbox and
// the notification subject say where the lead came from.
export const NORTHWOODS_SOURCES = {
  contact: "northwoods",
  search: "northwoods-search",
} as const;

const NORTHWOODS_SOURCE_SET = new Set<string>(Object.values(NORTHWOODS_SOURCES));

// Who else gets the notification email for a lead from this source. undefined,
// not [], so Resend sees no cc field at all for every other funnel.
export function northwoodsCc(source: string): string[] | undefined {
  return NORTHWOODS_SOURCE_SET.has(source) ? [JAY_EMAIL] : undefined;
}
