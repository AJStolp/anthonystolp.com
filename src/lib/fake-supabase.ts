// Test only: an in-memory stand-in for the few Supabase query builder calls
// the lead and newsletter code makes (select, insert, update, eq, is, not,
// limit, single, maybeSingle). Rows live in `tables`; every write is applied
// there, so a test asserts on the rows rather than on the calls.

import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;
type Result = { data: unknown; error: { message: string } | null };

export type FakeSupabase = {
  client: SupabaseClient;
  tables: Record<string, Row[]>;
};

export function fakeSupabase(tables: Record<string, Row[]> = {}): FakeSupabase {
  const rowsOf = (table: string) => (tables[table] ??= []);

  function query(table: string) {
    let op: "select" | "insert" | "update" = "select";
    let payload: Row = {};
    let limit = Infinity;
    const filters: Filter[] = [];

    const run = (): Row[] => {
      if (op === "insert") {
        const row = { id: crypto.randomUUID(), ...payload };
        rowsOf(table).push(row);
        return [row];
      }
      const matched = rowsOf(table).filter((r) => filters.every((f) => f(r)));
      if (op === "update") for (const r of matched) Object.assign(r, payload);
      return matched.slice(0, limit);
    };

    const builder = {
      select: () => builder,
      insert: (row: Row) => ((op = "insert"), (payload = row), builder),
      update: (patch: Row) => ((op = "update"), (payload = patch), builder),
      eq: (col: string, val: unknown) => (filters.push((r) => r[col] === val), builder),
      is: (col: string, val: null) => (filters.push((r) => (r[col] ?? null) === val), builder),
      not: (col: string, _op: "is", val: null) => (
        filters.push((r) => (r[col] ?? null) !== val), builder
      ),
      limit: (n: number) => ((limit = n), builder),
      single: async (): Promise<Result> => {
        const rows = run();
        return rows.length === 1
          ? { data: { ...rows[0] }, error: null }
          : { data: null, error: { message: `expected one row, got ${rows.length}` } };
      },
      maybeSingle: async (): Promise<Result> => {
        const rows = run();
        return { data: rows[0] ? { ...rows[0] } : null, error: null };
      },
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => {
        try {
          const rows = run();
          return Promise.resolve({
            data: op === "update" ? null : rows.map((r) => ({ ...r })),
            error: null,
          }).then(resolve, reject);
        } catch (err) {
          return Promise.reject(err).then(resolve, reject);
        }
      },
    };
    return builder;
  }

  const client = {
    from: (table: string) => query(table),
    // The rate limiter's increment_rate_limit: always under the limit.
    rpc: async () => ({ data: true, error: null }),
  } as unknown as SupabaseClient;
  return { client, tables };
}
