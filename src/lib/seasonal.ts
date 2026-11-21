// The homepage hero's seasonal line, under the two hero buttons. The year end
// line runs until midnight on Jan 1, 2027, Central time; after that the hero
// shows none until a spring line is written here.
const YEAR_END_UNTIL = new Date("2027-01-01T00:00:00-06:00");

export const YEAR_END_LINE =
  "Want to buy or sell before the new year? Call or text me this week and I'll tell you honestly whether the timing works for you.";

export function seasonalLine(now: Date = new Date()): string | null {
  return now < YEAR_END_UNTIL ? YEAR_END_LINE : null;
}
