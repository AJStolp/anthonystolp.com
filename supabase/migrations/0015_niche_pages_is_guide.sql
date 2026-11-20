-- 0015_niche_pages_is_guide.sql
--
-- A page is a guide because it is marked as one, not because it has a body.
-- 0010 made `body` the signal, but city pages now carry body copy too and must
-- keep their city treatment. `geo` cannot be the signal either: the guides
-- carry geo = 'Wisconsin', and no row has a null geo.
--
-- is_guide drives the Article JSON-LD, the "Common questions" heading and the
-- legal and tax disclaimer on /search/[slug].
--
-- The four guides are named rather than selected by `where body is not null`,
-- so a city page that already has body copy is never marked a guide.
--
-- Down: alter table public.niche_pages drop column is_guide;

alter table public.niche_pages
  add column if not exists is_guide boolean not null default false;

update public.niche_pages
   set is_guide = true
 where slug in (
   'downsizing-in-wisconsin',
   'selling-a-house-during-divorce-wisconsin',
   'selling-an-inherited-house-wisconsin',
   'selling-before-foreclosure-wisconsin'
 );
