// In-memory stand-in for the Supabase query builder, for unit tests only.
//
// It applies eq / is / not-is-null / lt filters, order and limit to seeded
// rows, so a query that drops a filter returns different rows and the test
// sees it. Inserts are recorded per table and given an id.

import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string } | null };

export function fakeSupabase(
  seed: Record<string, Row[]>,
  opts: { failTables?: string[] } = {},
) {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(seed)) {
    tables[name] = rows.map((r) => ({ ...r }));
  }
  const inserts: Record<string, Row[]> = {};
  let nextId = 1;

  function from(table: string) {
    const filters: Array<(r: Row) => boolean> = [];
    let orderBy: { col: string; ascending: boolean } | null = null;
    let limitN: number | null = null;
    let inserted: Row | null = null;

    function rows(): Row[] {
      let out = inserted ? [inserted] : (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
      if (orderBy) {
        const { col, ascending } = orderBy;
        out = [...out].sort((a, b) => {
          const x = String(a[col]);
          const y = String(b[col]);
          return (x < y ? -1 : x > y ? 1 : 0) * (ascending ? 1 : -1);
        });
      }
      if (limitN != null) out = out.slice(0, limitN);
      return out;
    }

    function result(shape: "many" | "maybeSingle" | "single"): Result {
      if (opts.failTables?.includes(table)) {
        return { data: null, error: { message: `${table} unavailable` } };
      }
      const out = rows();
      if (shape === "many") return { data: out, error: null };
      if (shape === "single" && out.length !== 1) {
        return { data: null, error: { message: "expected one row" } };
      }
      return { data: out[0] ?? null, error: null };
    }

    const builder = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        filters.push((r) => r[col] === val);
        return builder;
      },
      is: (col: string, val: null) => {
        filters.push((r) => (val === null ? r[col] == null : r[col] === val));
        return builder;
      },
      not: (col: string, op: string, val: null) => {
        if (op !== "is" || val !== null) throw new Error(`fake: unsupported not(${op})`);
        filters.push((r) => r[col] != null);
        return builder;
      },
      lt: (col: string, val: unknown) => {
        filters.push((r) => String(r[col]) < String(val));
        return builder;
      },
      order: (col: string, o?: { ascending?: boolean }) => {
        orderBy = { col, ascending: o?.ascending ?? true };
        return builder;
      },
      limit: (n: number) => {
        limitN = n;
        return builder;
      },
      insert: (row: Row) => {
        inserted = { id: `row-${nextId++}`, ...row };
        (inserts[table] ??= []).push(inserted);
        (tables[table] ??= []).push(inserted);
        return builder;
      },
      maybeSingle: async () => result("maybeSingle"),
      single: async () => result("single"),
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(result("many")).then(resolve, reject),
    };
    return builder;
  }

  return { client: { from } as unknown as SupabaseClient, inserts };
}
