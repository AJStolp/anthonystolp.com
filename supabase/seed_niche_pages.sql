-- seed_niche_pages.sql
--
-- Ozaukee County, WI core market lock for Anthony Stolp.
-- 14 niche landing pages: 7 sell-intent (drives to /home-value + bndryiq estimate)
--                         7 buy-intent (drives to SearchGate → exsellexperts.com)
--
-- Coverage:
--   Cedarburg, Thiensville, Mequon, Grafton, Port Washington, Saukville
--   plus Ozaukee County broad pages for top-of-funnel
--
-- Pages are independently editable via /admin/pages/[slug]. After admin edits,
-- DO NOT re-run this file — it will not overwrite (ON CONFLICT DO NOTHING),
-- but treat this seed as initial state only.
--
-- Run once via Supabase SQL editor, or:
--   bunx supabase db execute --file supabase/seed_niche_pages.sql

insert into public.niche_pages
  (slug, title, h1, intent, geo, filters, hero_copy, meta_desc, active, agent_id)
values
  -- ── SELL-SIDE (7) ─────────────────────────────────────────────────────
  (
    'cedarburg-home-value',
    'Cedarburg WI Home Value — Honest Local Pricing',
    'What is your Cedarburg home worth?',
    'sell',
    'Cedarburg, WI',
    null,
    'Cedarburg homes carry a premium that algorithms often miss. Historic district, walkability to downtown and Cedar Creek, school zones, condition. All of it matters here more than almost anywhere else in southeast Wisconsin. Get a real range from a local agent.',
    'Free Cedarburg WI home value estimate. Historic district expertise, real comps, no fluff. Delivered within 24 hours by Anthony Stolp.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),
  (
    'mequon-home-value',
    'Mequon WI Home Value Estimate — Local Honest Pricing',
    'What is your Mequon home worth?',
    'sell',
    'Mequon, WI',
    null,
    'Mequon does not price like generic suburbs. The Mequon-Thiensville school district, lot size, lake proximity, and condition all move the number more than most algorithms account for. Get an honest range from a local agent.',
    'Free Mequon WI home value estimate. Mequon-Thiensville school district context, real comps. 24 hour turnaround by Anthony Stolp.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),
  (
    'thiensville-home-value',
    'Thiensville WI Home Value — Local Real Numbers',
    'What is your Thiensville home worth?',
    'sell',
    'Thiensville, WI',
    null,
    'Thiensville is its own market. The walkable village, Cedar Creek, and the Mequon-Thiensville school district make these homes distinct from the surrounding area. Get a real range tied to your block, not a generic algorithm.',
    'Free Thiensville WI home value estimate. Village walkability and Mequon-Thiensville school district context. 24 hour turnaround by Anthony Stolp.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),
  (
    'grafton-home-value',
    'Grafton WI Home Value — Real Local Pricing',
    'What is your Grafton home worth?',
    'sell',
    'Grafton, WI',
    null,
    'Grafton homes move on river access, school zone, and how much sweat equity has gone into the property. Get a real range from a local agent who tracks what is actually selling in Grafton right now.',
    'Free Grafton WI home value estimate. Local comps, honest numbers, 24 hour turnaround by Anthony Stolp, ExSell Experts.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),
  (
    'port-washington-home-value',
    'Port Washington WI Home Value Estimate',
    'What is your Port Washington home worth?',
    'sell',
    'Port Washington, WI',
    null,
    'Lake Michigan proximity, harbor views, downtown walkability. Port Washington homes carry context that algorithms often miss. Get a real range from a local agent who works this coastal market every week.',
    'Free Port Washington WI home value estimate. Lake Michigan and harbor context, real comps. 24 hour turnaround by Anthony Stolp.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),
  (
    'saukville-home-value',
    'Saukville WI Home Value — Honest Local Pricing',
    'What is your Saukville home worth?',
    'sell',
    'Saukville, WI',
    null,
    'Saukville does not get the same algorithm treatment as the rest of Ozaukee County. Lot size, condition, and the rural-edge premium matter here. Get a real range from a local agent who knows the market.',
    'Free Saukville WI home value estimate. Local comps, honest numbers. 24 hour turnaround by Anthony Stolp, ExSell Experts at Epique Realty.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),
  (
    'ozaukee-county-home-value',
    'Ozaukee County WI Home Value Estimate',
    'Ozaukee County home values',
    'sell',
    'Ozaukee County, WI',
    null,
    'From Mequon and Thiensville to Cedarburg, Grafton, Port Washington, and Saukville. Get a real range for your home based on actual recent Ozaukee County sales. Sent within 24 hours by a local agent who works this exact area.',
    'Free home value estimate for Ozaukee County, WI. Mequon, Cedarburg, Grafton, Port Washington, Thiensville, Saukville. By Anthony Stolp.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),

  -- ── BUY-SIDE (7) ──────────────────────────────────────────────────────
  (
    'cedarburg-homes-for-sale',
    'Homes for Sale in Cedarburg WI — Listings + Alerts',
    'Homes for sale in Cedarburg',
    'buy',
    'Cedarburg, WI',
    null,
    'Cedarburg inventory moves fast and the best places do not sit long. Browse active listings, get alerts when new ones hit MLS, and bring questions to a local agent who knows the neighborhoods, the schools, and what is actually worth seeing.',
    'Search active Cedarburg WI homes for sale. New-listing alerts and local agent guidance from Anthony Stolp, ExSell Experts.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),
  (
    'mequon-homes-for-sale',
    'Homes for Sale in Mequon WI — North Shore Listings',
    'Find your place in Mequon',
    'buy',
    'Mequon, WI',
    null,
    'Mequon-Thiensville school district homes do not sit long. Get the active Mequon listings plus alerts the moment new homes hit MLS, with local agent help to separate the deals from the rest.',
    'Search active Mequon WI homes for sale. Mequon-Thiensville school district focus, new-listing alerts. Anthony Stolp, ExSell Experts.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),
  (
    'thiensville-homes-for-sale',
    'Homes for Sale in Thiensville WI',
    'Homes for sale in Thiensville',
    'buy',
    'Thiensville, WI',
    null,
    'Thiensville is small, walkable, and limited on inventory. Get active listings plus new-listing alerts the moment anything hits MLS in the village or the Mequon-Thiensville school district.',
    'Search Thiensville WI homes for sale plus new-listing alerts. Anthony Stolp, ExSell Experts at Epique Realty.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),
  (
    'grafton-homes-for-sale',
    'Homes for Sale in Grafton WI',
    'Homes for sale in Grafton',
    'buy',
    'Grafton, WI',
    null,
    'Grafton offers more home for the money than most of Ozaukee County. River access, growing downtown, strong schools. Get the active Grafton listings plus alerts when new ones list.',
    'Search active Grafton WI homes for sale. New-listing alerts and local agent guidance from Anthony Stolp.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),
  (
    'port-washington-homes-for-sale',
    'Homes for Sale in Port Washington WI',
    'Homes for sale in Port Washington',
    'buy',
    'Port Washington, WI',
    null,
    'Lake Michigan harbor town, walkable downtown, lighthouse views. Port Washington homes go fast when they list right. Get active inventory plus new-listing alerts to catch them in time.',
    'Search active Port Washington WI homes for sale. New-listing alerts, harbor town local guidance from Anthony Stolp.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),
  (
    'saukville-homes-for-sale',
    'Homes for Sale in Saukville WI',
    'Homes for sale in Saukville',
    'buy',
    'Saukville, WI',
    null,
    'Saukville sits at the edge of Ozaukee County with more land and more options per dollar than the lake-adjacent towns. Get active listings plus new-listing alerts as homes hit MLS.',
    'Search active Saukville WI homes for sale. New-listing alerts and local agent guidance from Anthony Stolp.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),
  (
    'ozaukee-county-homes-for-sale',
    'Homes for Sale in Ozaukee County WI',
    'Homes for sale in Ozaukee County',
    'buy',
    'Ozaukee County, WI',
    null,
    'Mequon, Cedarburg, Thiensville, Grafton, Port Washington, Saukville. Browse every active Ozaukee County listing plus new-listing alerts, with local agent guidance to help you focus on what fits.',
    'Search active Ozaukee County WI homes for sale across Mequon, Cedarburg, Grafton, Port Washington, Thiensville, Saukville. By Anthony Stolp.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  )
on conflict (slug) do nothing;
