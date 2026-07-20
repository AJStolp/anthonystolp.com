-- 0012_open_house_end.sql — add an end time so the page can show a range
-- (e.g. "Saturday, August 1, 10:00 to 11:30 AM"). open_house_at stays the
-- start; open_house_end is optional.

alter table public.properties
  add column if not exists open_house_end timestamptz;
