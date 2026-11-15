# SkillSwap Connect – Installation

## Safety and scope

This is an additive patch for the existing SkillSwap project. It reuses the existing login/token flow and existing PostgreSQL pool. It does **not** replace authentication, edit `.env`/`.env.production`, change `DATABASE_URL`, or modify existing user/auth tables.

Back up the project or commit it to Git before copying files. Merge the package paths into the existing project root (`C:\Users\alc\skillswap`). Do not replace environment files.

## 1. Copy source files

Extract this ZIP and copy its `src/` and `backend/src/` folders into the existing project, preserving directory structure. Also copy `backend/migrations/` and `backend/scripts/`.

If you have newer local edits to any included file, compare and merge rather than blindly overwriting them.

## 2. Database schema (separate, explicit step)

The supplied migration creates only ten new `connect_*` tables and their indexes. It does not create or alter users, auth, payment, or other SkillSwap tables. The script is idempotent for these tables (`CREATE TABLE IF NOT EXISTS`).

From PowerShell:

```powershell
cd C:\Users\alc\skillswap\backend
node .\scripts\apply-connect-schema.mjs
```

This uses the existing `DATABASE_URL` from the backend's existing environment. It prints only the database and schema names, never the connection string. Review the target before proceeding. Do not run it if the displayed target is not your existing SkillSwap Neon database and `public` schema. No database changes are made merely by extracting this ZIP.

## 3. Start and build

Terminal 1:

```powershell
cd C:\Users\alc\skillswap\backend
npm run dev
```

Terminal 2:

```powershell
cd C:\Users\alc\skillswap
npm run dev
```

Build checks:

```powershell
# frontend
cd C:\Users\alc\skillswap
npm run build

# backend
cd C:\Users\alc\skillswap\backend
npm run build
```

## 4. Routes

The existing app mounts Connect at `/connect`; the API is mounted at `/api/connect`. Vite's `/api` proxy is retained in the supplied integration source.

## 5. Required two-account test

Use two real SkillSwap test accounts. Follow `CONNECT_TEST_PLAN.md`. Do not test by sharing one login token between accounts.

## Known feature gates

- Credit-based booking is intentionally disabled until it is connected to the existing, audited SkillSwap credit ledger. No credits are charged by this patch.
- Secure meeting join links are disabled until a server-side Jitsi JWT/token provider is configured. The API must not expose a raw guessable room URL.
- Availability rows can be created/read/deleted, but recurring slot selection and conflict enforcement are not yet end-to-end in the booking UI.
- Waitlists, block lists, admin moderation workflows, email/push delivery, and full reschedule proposal acceptance/rejection UX require additional product/backend work.
