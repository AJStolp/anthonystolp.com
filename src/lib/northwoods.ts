// The Northwoods team page (/northwoods): Anthony and his cousin Jay, working
// Marinette County together. Shared by the page and /api/lead, which copies
// Jay on every lead this page produces.

export type TeamMember = {
  name: string;
  title: string;
  phone: string;
  email: string;
  // null renders an initials placeholder until a photo is dropped in /public.
  photo: string | null;
};

export const NORTHWOODS_TEAM: TeamMember[] = [
  {
    name: "Anthony Stolp",
    title: "REALTOR®",
    phone: "(262) 483-7932",
    email: "Anthony@exsellexperts.com",
    photo: "/images/anthony-headshot.png",
  },
  {
    name: "Jay Stolp",
    title: "REALTOR®",
    phone: "(414) 807-2478",
    email: "Jaystolp@exsellexperts.com",
    photo: "/images/northwoods/jay-headshot.png",
  },
];

// How the brokerage is written on the Northwoods page, which AJ wants as the
// pipe form rather than the profile's "ExSell Experts at Epique Realty".
export const NORTHWOODS_BROKERAGE = "ExSell Experts | Epique Realty";

// Lead sources the page sends. Kept apart from the site's own sources so the
// inbox and the notification subject say where the lead came from.
export const NORTHWOODS_SOURCES = {
  contact: "northwoods",
  search: "northwoods-search",
} as const;

const NORTHWOODS_SOURCE_SET = new Set<string>(Object.values(NORTHWOODS_SOURCES));

// Who else gets the notification email for a lead from this source. undefined,
// not [], so Resend sees no cc field at all for every other funnel.
export function northwoodsCc(source: string): string[] | undefined {
  return NORTHWOODS_SOURCE_SET.has(source) ? ["Jaystolp@exsellexperts.com"] : undefined;
}

export function telHref(phone: string): string {
  return `tel:+1${phone.replace(/\D/g, "")}`;
}
