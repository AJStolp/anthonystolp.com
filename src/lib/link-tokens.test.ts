import { describe, expect, mock, test } from "bun:test";

// randomBytes is real unless a test queues the exact bytes it should return,
// so the uniformity check measures the actual generator and the rejection
// check can hand it bytes that must be thrown away.
const realCrypto = { ...(await import("node:crypto")) };
const realRandomBytes = realCrypto.randomBytes;
const queued: number[][] = [];
mock.module("node:crypto", () => ({
  ...realCrypto,
  randomBytes: (n: number) => {
    const next = queued.shift();
    return next ? Buffer.from(next) : realRandomBytes(n);
  },
}));
const { generateSlug } = await import("./link-tokens");

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

describe("link token slugs", () => {
  test("every character is within 5% of uniform across 100k tokens", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 100_000; i++) {
      const slug = generateSlug(10);
      expect(slug.length).toBe(10);
      for (const ch of slug) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([...ALPHABET].sort());
    const expected = 1_000_000 / ALPHABET.length;
    const worst = Math.max(
      ...[...counts.values()].map((c) => Math.abs(c - expected) / expected),
    );
    expect(worst).toBeLessThan(0.05);
  });

  test("bytes of 224 and above are dropped and redrawn, not wrapped", () => {
    // 224 = 4 * 56. Wrapping 255 would give ALPHABET[31] and 224 would give
    // ALPHABET[0]; both must be skipped, and the slug still reaches 10.
    queued.push(
      [255, 0, 224, 223, 250, 1, 240, 2, 3, 4],
      [230, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    );
    expect(generateSlug(10)).toBe(
      [0, 223, 1, 2, 3, 4, 5, 6, 7, 8].map((b) => ALPHABET[b % 56]).join(""),
    );
  });
});
