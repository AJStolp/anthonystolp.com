# Package manager: bun (NOT npm)

This project uses **bun**. The lockfile is `bun.lock`. Always use bun, never npm or yarn:

- Install: `bun install`
- Run scripts: `bun run build`, `bun run dev`, `bun run start`
- One-off binaries: `bunx <pkg>` (e.g. `bunx supabase db execute --file ...`)

Do not run `npm install` / `npm run *` — it can create a conflicting `package-lock.json` and pull a different dependency tree than `bun.lock`. If a `package-lock.json` ever appears, it was a mistake: delete it.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
