import type { LoftyLeadInput } from "./lofty";

// The contact forms that reach Lofty directly: the home page's and the
// Northwoods page's, both the shared LeadForm, which asks for a name (T-080).
const CONTACT_SOURCES = {
  "contact-form": { source: "Website Contact", tag: "Contact form", form: "the contact form" },
  northwoods: { source: "Website Northwoods", tag: "Northwoods", form: "the Northwoods contact form" },
} as const;

type ContactSource = keyof typeof CONTACT_SOURCES;

export function isContactLeadSource(source: string): source is ContactSource {
  return Object.hasOwn(CONTACT_SOURCES, source);
}

const INTENT_WORDS: Record<string, { tag: string; words: string }> = {
  buy: { tag: "Buyer", words: "wants to buy" },
  sell: { tag: "Seller", words: "wants to sell" },
  both: { tag: "Buyer and Seller", words: "wants to buy and sell" },
  exploring: { tag: "Exploring", words: "is just exploring" },
};

export type ContactLead = {
  source: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  intent?: string | null;
  message?: string | null;
};

// The Lofty lead for a contact form, or null when it is not one, or has no
// name to file it under.
export function contactLoftyLead(lead: ContactLead): LoftyLeadInput | null {
  if (!isContactLeadSource(lead.source)) return null;
  const [firstName, ...rest] = (lead.name ?? "").trim().split(/\s+/);
  if (!firstName) return null;

  const { source, tag, form } = CONTACT_SOURCES[lead.source];
  const intent = lead.intent ? INTENT_WORDS[lead.intent] : undefined;
  const tags: string[] = [tag];
  if (intent) tags.push(intent.tag);

  const note = [
    `Sent ${form} on the website${intent ? ` and ${intent.words}` : ""}.`,
    lead.message?.trim() ? `Message: ${lead.message.trim()}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    firstName,
    lastName: rest.join(" ") || null,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    source,
    tags,
    note,
  };
}
