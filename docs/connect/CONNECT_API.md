# SkillSwap Connect API surface

Base path: `/api/connect`. Authenticated endpoints use the existing SkillSwap bearer token; public discovery and published activity pages do not require login.

## Public

- `GET /health`
- `GET /activities` – published activity discovery; supports `search`, `category`, `mode`, `limit`.
- `GET /activities/:slug` – published activity detail only.
- `GET /activities/:id/availability`
- `GET /hosts/:userId` – public host profile summary.

## Authenticated

- `GET /activities/:slug/preview` – owner-only draft/unpublished preview.
- `POST /activities`, `PATCH /activities/:id`, `POST /activities/:id/publish`, `POST /activities/:id/unpublish`, `POST /activities/:id/cancel`.
- `GET /me/activities`, `GET /me/bookings`, `GET /activities/:id/bookings`.
- `POST /activities/:id/bookings`, `POST /bookings/:id/approve`, `/reject`, `/cancel`.
- `POST /bookings/:id/reschedule`, `POST /bookings/:id/reschedule/confirm`.
- `GET /me/conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`.
- `GET /me/notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`.
- `GET /me/calendar`, `GET /me/calendar.ics`.
- `GET /bookings/:id/meeting` – authorization checked; returns provider not configured until secure Jitsi signing is implemented.
- `POST /activities/:id/reports`, `POST /activities/:id/reviews`.

All ownership and membership checks must remain server-side. The frontend is not an authorization boundary.
