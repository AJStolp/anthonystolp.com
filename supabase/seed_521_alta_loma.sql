-- Seed: 521 Alta Loma Dr, Thiensville — first open-house property.
-- Idempotent: re-running updates the row in place.
--
-- 2026-08-02: went under contract. Status is 'pending' (accepted offer, not
-- yet closed), which keeps the page published with the open-house sign-in
-- swapped for a sell CTA. Price is the current public MLS list price after
-- the Sunday adjustment; the contract price is deliberately not published.
-- Open-house timestamps are cleared now that the event has passed.
-- photo_url points at a file in public/properties/ (URL-only for now;
-- S3/Storage later). Edit price/description/status here or via the admin UI.

insert into public.properties (
  slug, status, address, city, state, postal_code,
  price, beds, baths, sqft, description, photo_url,
  open_house_at, open_house_end
) values (
  '521-alta-loma',
  'pending',
  '521 Alta Loma Dr',
  'Thiensville',
  'WI',
  '53092',
  450000,
  3,
  2,
  1556,
  'Under contract. 521 Alta Loma Dr went live on a Thursday and had an accepted offer by Sunday.

A well-kept 3 bedroom, 2 bath ranch in the heart of Thiensville, with 1,556 square feet of easy single-level living, mature shade trees, and an attached garage. It sits in one of Ozaukee County''s most walkable villages, minutes from downtown Thiensville''s shops and restaurants, the Milwaukee River, and the Mequon-Thiensville School District.

Thinking about selling in Ozaukee County? Start with an honest read on what your home is worth today. Pricing is what moves a listing, and I will show you the comparable sales behind the number rather than just handing you a figure.',
  '/properties/521-alta-loma.jpg',
  null,
  null
)
on conflict (slug) do update set
  status        = excluded.status,
  address       = excluded.address,
  city          = excluded.city,
  state         = excluded.state,
  postal_code   = excluded.postal_code,
  price         = excluded.price,
  beds          = excluded.beds,
  baths         = excluded.baths,
  sqft          = excluded.sqft,
  description   = excluded.description,
  photo_url      = excluded.photo_url,
  open_house_at  = excluded.open_house_at,
  open_house_end = excluded.open_house_end;
