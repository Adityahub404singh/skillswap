# SkillSwap Backend — Connect integration

This package is the existing SkillSwap backend with the Connect module integrated as an isolated feature namespace.

## Safety / compatibility

- Existing SkillSwap auth middleware is reused through `src/connect/middleware/auth.ts`.
- Existing `users`, `sessions`, `transactions`, `wallet`, `notifications`, and other core tables are not altered by Connect migrations.
- Connect data uses `connect_*` tables and existing SkillSwap user IDs as opaque text values.
- Existing API mounts remain in `src/index.ts`; Connect is mounted at `/api/connect`.
- Credit-priced Connect bookings deliberately fail closed (HTTP 501) until an adapter to the existing wallet/ledger is explicitly implemented. No credits are silently deducted.
- The meeting endpoint checks booking membership and returns a stable room reference. It does NOT create provider-authenticated Jitsi JWTs; configure JaaS/private Jitsi before claiming provider-level room privacy.

## Database migrations

Apply in this exact order to the same Neon/PostgreSQL database:

1. `src/database/migrations/001_connect_init.sql`
2. `src/database/migrations/002_connect_email_outbox.sql`
3. `src/database/migrations/003_connect_flow_completion.sql`

Migration 003 adds missing `agenda` / `faqs` columns used by the service, the meeting-to-conversation relation, and message `read_at` receipts. All changes are confined to Connect tables.

## Run

```powershell
npm install
npm run dev
```

## Connect checks

```powershell
npm run check:connect
```

## E2E test setup

Use three separate existing SkillSwap accounts: host, participant, and stranger. Create bearer tokens using the normal SkillSwap login flow. Never commit tokens or `.env`.

```powershell
$env:CONNECT_BASE_URL="http://localhost:3001/api/connect"
$env:CONNECT_HOST_TOKEN="HOST_BEARER_TOKEN"
$env:CONNECT_PARTICIPANT_TOKEN="PARTICIPANT_BEARER_TOKEN"
$env:CONNECT_STRANGER_TOKEN="STRANGER_BEARER_TOKEN"
npm run test:connect
```

The E2E suite creates temporary activities and attempts application-level cancellation in cleanup. Run against a development/staging database, not production.

Worker unit tests (no database or email provider required):

```powershell
npm run test:connect:unit
```

Full API suite (requires the three tokens and a migrated test database):

```powershell
npm run test:connect:all
```

## Email delivery

`src/connect/workers/connect-email-outbox.js` claims queued messages transactionally and retries provider errors. It is provider-agnostic. Wire its `resolveUserEmail` callback to the existing `users` table and `sendEmail` callback to the configured SkillSwap email provider, then schedule the worker. Until this is configured, notifications are stored and queued but actual email delivery is not guaranteed.

## Flow coverage and known boundaries

Covered by the API E2E suite: activity draft/publish, discovery, host ownership, instant and approval bookings, seat limits, host/participant/stranger visibility, bidirectional messaging, automatic and explicit read receipts, notification ownership, booking cancellation, rescheduling, calendar/ICS, reports, reviews, and meeting membership authorization.

Covered by worker unit tests: HTML escaping, successful outbox delivery, and retry after provider failure.

Not yet verifiable from this source bundle alone: actual inbox push/realtime delivery, real external email delivery, Jitsi provider-authenticated join, existing wallet debit/refund adapter, and a true multi-attendee shared group room. The current meeting model is booking-scoped (one host + one participant per booking). These require provider/account configuration and explicit product decisions; they are not falsely represented as complete.
