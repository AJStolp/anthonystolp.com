// The towns a listing alert card offers in its dropdown, in the homepage
// tiles' order (T-095). The homepage and /buy both use it (T-103). No
// "use client" here, so a server page can import it.
export const ALERT_TOWNS = [
  "Cedarburg",
  "Mequon",
  "Thiensville",
  "Grafton",
  "Port Washington",
  "Saukville",
  "Ozaukee County",
] as const;
