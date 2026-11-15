# SkillSwap Connect backend integration

## Safety boundary
Connect data is isolated in `connect_*` tables. The existing SkillSwap `users`, auth, wallet,
transactions, sessions, and non-Connect routes are not replaced. Connect user IDs are stored as
text and resolved against `users.id::text`.

## Activity dimensions
- `session_type`: `one_to_one`, `group`, `webinar`, `mentorship`, `qa`, `meetup`
- `delivery_mode`: `online`, `offline`, `hybrid`
- Existing `booking_type` remains backward-compatible with the current frontend: `instant`,
  `host_approval`, `one_to_one`, `group`, `limited_seat`.
- `format` remains supported for existing frontend clients.

For new activity payloads send `sessionType` and `deliveryMode`. Supported session types are
`standard`, `one_to_one`, `group`, `webinar`, `mentorship`, `qa`, and `meetup`. If omitted, the service maps
legacy `bookingType=one_to_one` to one-to-one and other legacy payloads to `standard` (private per-booking
room/chat, preserving existing frontend behavior); new group activities must explicitly send `sessionType: group`. Delivery mode
defaults to `format`. `bookingType` remains the legacy instant/approval setting for compatibility.

## Booking and capacity
Booking creation locks the activity row before checking capacity. Duplicate active bookings are
rejected. Pending approval requests do not consume confirmed capacity; approval rechecks capacity
under lock. One-to-one activities require one seat. Existing credit-priced bookings fail closed
until a ledger adapter is connected; no credits are silently deducted.

## Group room and chat
Confirmed non-one-to-one bookings share one activity room and one activity group conversation.
One-to-one bookings retain a per-booking room and private conversation. Cancelled participants
are removed from the activity group conversation; their booking meeting is revoked.

## Messaging and seen
Fetching a conversation marks incoming messages as read by setting `connect_messages.read_at`.
Fetching a conversation marks incoming messages as read for the current member. Group messages use `connect_message_receipts(message_id, user_id, read_at)` so the UI can show
exactly which participants have seen each message. Group sessions share one activity-wide
conversation and one room; one-to-one sessions keep a private conversation and room. `connect_messages.read_at` remains for backward compatibility.

## Email and calendar
The notification service inserts an outbox row in the same database transaction as the
notification. `startConnectRuntime(pool)` runs every minute, claims outbox jobs with
`FOR UPDATE SKIP LOCKED`, retries provider errors, enriches booking notifications from the
existing users table, sends appointment details and attaches an ICS calendar file. Reminder
rows are created at confirmation for 24h, 1h and 15m before the scheduled start.

The runtime uses the existing Nodemailer transporter. Configure `EMAIL_USER` and `EMAIL_PASS`
(or SMTP aliases). If the provider is not configured, the worker retries and eventually marks
the job failed; booking state is not rolled back by email provider outages.

## Meeting security
The API checks authenticated booking membership and only returns a Jitsi JWT join URL when
`JITSI_DOMAIN`, `JITSI_APP_ID`, `JITSI_KEY_ID`, and `JITSI_PRIVATE_KEY` are configured.
The email worker generates a recipient-specific JWT link as well. Use a JaaS/private Jitsi
deployment whose JWT configuration matches these claims. Do not use
public `meet.jit.si` rooms for private or confidential sessions. Verify the JWT with your actual
Jitsi provider before production.

## Migrations
Apply in order:
1. `migrations/20261114_connect_schema.sql`
2. `migrations/20261115_connect_end_to_end.sql`

The older `connect_schema_setup.sql` is a setup snapshot, not an additional migration.

## Tests
- `npm run check:connect`
- `npm run test:connect:unit`
- `npm run test:connect:e2e` (requires running API and three independent tokens)

The current environment has no live Neon credentials or host/participant/stranger tokens, so
live E2E and provider delivery have not been run here.
