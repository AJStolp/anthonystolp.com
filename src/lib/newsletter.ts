// The River Report: the one monthly email from the site (T-113). Shared by
// the signup component, the confirm and welcome emails, the compliance footer
// and the unsubscribe pages, so the name is written once.

export const NEWSLETTER_NAME = "The River Report";

// The lead source every signup is stored under. The name predates the
// newsletter and stays on purpose: the market report cron, the reports send
// route and /api/unsubscribe all filter funnel_leads on it.
export const NEWSLETTER_SOURCE = "market-report-subscribe";

// The text a "Text me your street" link fills in, on the signup card and in
// an issue's "Your street" section.
export const STREET_SMS_BODY = "Hi Anthony, my street is ";

// Zip choices for the signup card. When multi-tenant, read from the agent
// profile's targetZips.
export const NEWSLETTER_ZIPS = [
  { value: "53012", label: "Cedarburg (53012)" },
  { value: "53092", label: "Mequon / Thiensville (53092)" },
  { value: "53097", label: "Mequon (53097)" },
  { value: "53024", label: "Grafton (53024)" },
  { value: "53074", label: "Port Washington (53074)" },
  { value: "53080", label: "Saukville (53080)" },
  { value: "53090", label: "West Bend (53090)" },
  { value: "53095", label: "West Bend (53095)" },
  { value: "53027", label: "Hartford (53027)" },
  { value: "53022", label: "Germantown (53022)" },
  { value: "53037", label: "Jackson (53037)" },
  { value: "53086", label: "Slinger (53086)" },
] as const;
