import { describe, expect, test } from "bun:test";
import { seasonalLine, YEAR_END_LINE } from "./seasonal";

describe("the hero's seasonal line", () => {
  test("shows the year end line in December", () => {
    expect(seasonalLine(new Date("2026-12-31T23:59:00-06:00"))).toBe(YEAR_END_LINE);
  });
  test("is gone from Jan 1, 2027, Central time", () => {
    expect(seasonalLine(new Date("2027-01-01T00:00:00-06:00"))).toBeNull();
    expect(seasonalLine(new Date("2027-03-01T12:00:00-06:00"))).toBeNull();
  });
});
