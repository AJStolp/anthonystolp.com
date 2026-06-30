-- 0010_niche_pages_guide.sql
--
-- Adds long-form "guide page" support to niche_pages so a page can carry
-- substantive educational content (e.g. life-event seller guides: probate,
-- divorce, pre-foreclosure, downsizing) instead of only a one-line hero.
--
-- Both columns are nullable; existing listing pages leave them null and render
-- exactly as before. The presence of `body` is what makes a page a "guide".
--
--   body  : markdown-lite. A line beginning "## " becomes an <h2>; blank lines
--           separate paragraphs. No new rendering dependency.
--   faqs  : jsonb array of { "q": string, "a": string } — page-specific FAQs
--           that override the generated buy/sell FAQ templates.

alter table public.niche_pages
  add column if not exists body  text,
  add column if not exists faqs  jsonb;
