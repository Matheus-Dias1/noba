# Oba Green

Gerenciador de pedidos Oba — rewrite of the original Electron + Express + MongoDB
app as a single full-stack **Next.js (App Router)** application, optionally wrapped
in a **Tauri 2** desktop shell.

See [`PAGES_EXTRACTION.md`](./PAGES_EXTRACTION.md) for the full page-by-page spec
this rewrite is based on.

## Stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript**
- **Tailwind v4** + **shadcn/ui** (green oklch theme, light + dark)
- **TanStack Query** (server state) + **TanStack Form** (native-input forms, full Tab navigation)
- **MongoDB + Mongoose** (kept from the original; a Postgres migration is planned later)
- **exceljs** for Excel export
- **Tauri 2** desktop wrapper (loads the deployed web app)
- Package manager: **pnpm**

## Environment

Copy `.env.example` to `.env.local` and fill in:

```
MONGO_USER=...
MONGO_PASS=...
MONGO_DB_NAME=...        # use a test DB, e.g. oba_dev — see "Database safety" below
TOKEN_SECRET=...         # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database safety

`src/lib/db.ts` **refuses** to connect to the production database (`oba`) outside a
production deploy unless `ALLOW_PRODUCTION_DB=1` is set. Validate against a restored
copy instead:

```bash
# back up production (read-only)
mongodump --uri "mongodb+srv://USER:PASS@cluster0.../oba?..." --out .db-backup
# restore into a test database
mongorestore --uri "mongodb+srv://USER:PASS@cluster0.../?..." --nsFrom "oba.*" --nsTo "oba_dev.*" --drop .db-backup
```

Then set `MONGO_DB_NAME=oba_dev`. `.db-backup/` is gitignored.

## Scripts

```bash
pnpm dev          # Next dev server (http://localhost:3000)
pnpm build        # production build
pnpm start        # serve the production build
pnpm lint         # eslint
pnpm tauri:dev    # run the desktop app against the dev server
pnpm tauri:build  # build the desktop app (loads the deployed URL)
```

## Deployment (Vercel)

The app deploys to Vercel from the `main` branch (auto-deploy on push). Required
production environment variables (Settings → Environment Variables, all envs):

| Name | Value |
| --- | --- |
| `MONGO_USER` | MongoDB user with read/write on the target DB |
| `MONGO_PASS` | that user's password |
| `MONGO_DB_NAME` | `oba` for production (use `oba_dev` for a preview/staging deploy) |
| `TOKEN_SECRET` | a 32-byte hex secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

Vercel sets `NODE_ENV=production`, which **bypasses** the `db.ts` guard that
blocks the production DB outside production — so `MONGO_DB_NAME=oba` works there.
Locally, keep `MONGO_DB_NAME=oba_dev`.

## Auth

Sessions are JWT in an **httpOnly cookie** (`oba_session`), 24h expiry. Login is
admin-only. Routes are protected by `src/proxy.ts` (Next 16's renamed middleware)
at the edge, plus a server-side guard in the `(app)` layout.

## Tauri (desktop)

The desktop shell wraps the **deployed** web app — it loads a URL rather than
bundling the frontend, so the full Next.js stack (SSR, API routes) stays intact.

- **Dev:** `pnpm tauri:dev` — starts `pnpm dev` and points the window at
  `http://localhost:3000`.
- **Production:** set `build.frontendDist` in `src-tauri/tauri.conf.json` to your
  deployed URL (currently a `https://CHANGE_ME...` placeholder), then
  `pnpm tauri:build`.

Window defaults match the original Electron app: 1100×700, same minimums,
centered.

## Notes on the port

This is a **faithful 1:1 behavioral port** of the original. Known bugs are
intentionally carried over (see `PAGES_EXTRACTION.md` §10) so old-vs-new can be
diffed cleanly; they'll be fixed in a dedicated pass after validation.

Intentional changes vs. the original:
- httpOnly-cookie auth (was localStorage + Bearer header)
- real URL routing (was state-based navigation)
- dropped the unused CASL dependency
- working order filters (batch + client) — the original's `?search=` filter never matched
- `_id` → `id` normalization on the wire (the original sent raw `_id`)
- shadcn look & feel (UI tweaks approved up front)
