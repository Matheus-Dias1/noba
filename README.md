# Oba Green

Oba Green is a work-in-progress rewrite of an internal order-management application for a food distribution business. The product UI and domain language are in Portuguese; the code and technical documentation are in English.

The repository also contains `order_ai/`, the prototype for an AI-assisted order-ingestion feature. It is not connected to the web application yet.

## Product areas

- **Lotes:** create batches, review aggregated order totals, filter included orders, and export Excel reports.
- **Pedidos:** create and edit orders by client unit, batch, delivery date, product, measurement unit, and processing option.
- **Produtos:** manage the catalog, unit conversions, processing options, and supplier relationships.
- **Clientes:** manage companies, delivery units, addresses, contacts, order history, and statistics.
- **Fornecedores:** manage suppliers, contacts, and product relationships.
- **Authentication:** admin-only sessions stored in an httpOnly cookie.

## Architecture

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4 and shadcn-based components
- TanStack Query for server state
- Postgres on Neon, accessed through Drizzle ORM
- `exceljs` for Excel exports
- Optional Tauri 2 desktop shell, intentionally deferred until the web application is mature
- pnpm package manager

The active application uses Postgres. MongoDB/Mongoose files and import scripts are residue from migrating the original application and are not part of normal runtime setup.

## Repository map

```text
src/app/             Pages and API route handlers
src/components/      Product and shared UI components
src/db/              Drizzle client and Postgres schema
src/queries/         Client-side query hooks
src/compute/         Deterministic domain aggregations
drizzle/             SQL migrations and migration metadata
order_ai/            Disconnected AI-assisted ingestion prototype
src-tauri/           Deferred desktop wrapper
```

`PAGES_EXTRACTION.md` documents the behavior of the older Oba Green application used as the rewrite reference. It is historical product input, not a complete description of the current implementation.

## Local setup

Requirements:

- Node.js compatible with Next.js 16
- pnpm
- A development or preview Postgres database; do not use the production database for local work

Install dependencies and create the local environment file:

```bash
pnpm install
cp .env.example .env.local
```

Set these values in `.env.local`:

```dotenv
DATABASE_URL=postgresql://...
DATABASE_URL_DIRECT=postgresql://...
TOKEN_SECRET=...
```

- `DATABASE_URL` is the pooled Neon connection used by the application.
- `DATABASE_URL_DIRECT` is the direct connection used by Drizzle Kit for DDL. If omitted, Drizzle falls back to `DATABASE_URL`.
- `TOKEN_SECRET` signs the 24-hour session JWT. Generate a local value with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Apply committed migrations, then start the application:

```bash
pnpm exec drizzle-kit migrate
pnpm dev
```

Open `http://localhost:3000`.

## Development commands

```bash
pnpm dev          # development server
pnpm build        # production build and TypeScript validation
pnpm start        # serve a production build
pnpm lint         # ESLint
pnpm tauri:dev    # deferred desktop development workflow
pnpm tauri:build  # deferred desktop packaging workflow
```

## Database changes

Edit the schema under `src/db/schema/`, generate a migration, review the generated SQL, and apply it to a non-production database:

```bash
pnpm exec drizzle-kit generate
pnpm exec drizzle-kit migrate
```

Production-derived datasets and one-off migration artifacts are intentionally excluded from Git. They are not needed to run Oba Green.

## Authentication

Sessions are JWTs stored in the `oba_session` httpOnly cookie with a 24-hour expiry. Login is admin-only. `src/proxy.ts` protects application and API routes, with a second server-side guard in the authenticated layout.

Newly registered users are not administrators by default. There is currently no in-app administrator-management interface.

## Deployment

An earlier rewrite version is deployed on Vercel. Do not assume it matches the current local branch or database schema; verify the target project, branch, environment variables, and migrations before deploying current work.

The active Vercel runtime requires `DATABASE_URL` and `TOKEN_SECRET`. Configure `DATABASE_URL_DIRECT` only where migration tooling runs; application requests do not use it directly.

## Tauri status

The Tauri wrapper is intentionally deferred until the web application is mature. Its production URL remains a placeholder, so `pnpm tauri:build` is not a release-ready workflow yet.

## AI-assisted ingestion

The nested [`order_ai/`](./order_ai/) package explores deterministic-first ingestion of email bodies and spreadsheet attachments, using an LLM only for ambiguous layout and context. It is not wired into the active order APIs or Postgres entities.

The integration boundary is still a proposed decision; see [ADR-003 in the Obsidian project vault](obsidian://open?vault=Documents&file=Projects%2FOrder%20AI%2FADRs%2FADR-003-ai-importer-boundary).
