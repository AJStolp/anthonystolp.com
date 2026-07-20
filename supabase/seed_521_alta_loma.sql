-- Seed: 521 Alta Loma Dr, Thiensville — first open-house property.
-- Idempotent: re-running updates the row in place.
--
-- Open house 2026-08-01 10:00–11:30 America/Chicago (CDT = UTC-5) → 15:00Z–16:30Z.
-- photo_url points at a file to drop in public/properties/ (URL-only for now;
-- S3/Storage later). Edit price/description/status here or via the admin UI.

insert into public.properties (
  slug, status, address, city, state, postal_code,
  price, beds, baths, sqft, description, photo_url,
  open_house_at, open_house_end
) values (
  '521-alta-loma',
  'coming_soon',
  '521 Alta Loma Dr',
  'Thiensville',
  'WI',
  '53092',
  495000,
  3,
  2,
  1556,
  'Welcome to 521 Alta Loma Dr, a well-kept 3 bedroom, 2 bath ranch in the heart of Thiensville. With 1,556 square feet of easy single-level living, mature shade trees, and an attached garage, it sits in one of Ozaukee County''s most walkable villages. You are minutes from downtown Thiensville''s shops and restaurants, the Milwaukee River, and the Mequon-Thiensville School District. Coming soon. Contact Anthony Stolp to schedule your first look.',
  '/properties/521-alta-loma.jpg',
  '2026-08-01T15:00:00Z',
  '2026-08-01T16:30:00Z'
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
