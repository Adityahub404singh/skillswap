# SkillSwap Connect – Refined Integration Patch

This patch is based on the supplied Connect source audit and the supplied SkillSwap integration audit. It is an additive patch for the existing project, not a replacement SkillSwap application.

## Included changes

- Owner-only authenticated `GET /api/connect/activities/:slug/preview`; the public slug route continues to expose published activities only.
- Event page falls back to owner preview for a host's own draft, loads `/me/bookings`, and shows existing booking state instead of inviting duplicate registration.
- Inbox opens a conversation, loads messages, and posts messages through the existing authenticated API.
- Host approval locks the activity row before checking capacity, preventing concurrent approvals from overbooking the final seat.
- Activity cancellation atomically cancels pending/confirmed bookings and related meeting rows, and notifies affected participants.
- API errors display either the server `error` or `message` field.
- Browser CORS rejects unlisted origins; configure the actual production frontend origin through the existing `FRONTEND_URL` setting.
- Added an isolated, idempotent SQL setup for the ten `connect_*` tables and indexes, plus a runner that uses the existing `DATABASE_URL` without printing it.
- Added installation, API, and manual acceptance-test documentation.

## Deliberately untouched

- `.env`, `.env.production`, `DATABASE_URL`, Neon host/branch/credentials.
- Existing SkillSwap auth store, login flow, user tables, payment tables, and existing migrations.
- No SQL is run automatically. The migration runs only if the user explicitly executes the provided script.

## Verification performed in this workspace

- `node --check` passed for the modified Connect route, service, and schema runner JavaScript files.
- TypeScript transpilation syntax checks passed for the modified Connect JSX and inspected app route file.
- Full frontend/backend builds and live DB/two-account acceptance tests have **not** been run here because the supplied source archive does not include installed dependencies or access to the user's running local environment/database.

## Known functionality not yet production-complete

- Credit-based booking is disabled until safely connected to SkillSwap's existing credit ledger.
- Meeting join links are disabled until a server-side Jitsi JWT/token adapter is configured.
- Availability is stored, but recurring slot selection and booking conflict enforcement are not yet complete end-to-end.
- Waitlists, block lists, admin moderation, email/push delivery, and full reschedule proposal accept/reject UX remain follow-up work.

See `docs/CONNECT_INSTALLATION.md`, `docs/CONNECT_API.md`, and `docs/CONNECT_TEST_PLAN.md`.
