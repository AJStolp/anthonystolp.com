-- 0013_property_pending_sold.sql — terminal statuses that stay on the site.
--
-- 0011 gave properties only 'closed', which unpublishes the page entirely.
-- A listing that goes under contract or sells is still worth showing: it is
-- proof, and the QR codes and NFC cards keep pointing at the URL. 'pending'
-- and 'sold' render publicly with the sign-in form swapped for a sell CTA;
-- 'closed' keeps its original meaning of off the site.
--
-- The 0011 check was an inline column constraint, so Postgres auto-named it
-- properties_status_check.

alter table public.properties
  drop constraint if exists properties_status_check;

alter table public.properties
  add constraint properties_status_check
  check (status in ('coming_soon', 'active', 'pending', 'sold', 'closed'));
