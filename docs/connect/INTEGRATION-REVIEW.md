# Integration review notes

## Frontend route protection
The parent SkillSwap router delegates `/connect` routes to `ConnectApp`. Public discovery, public activity detail and public host activity listings remain accessible. Create, My Activities, Bookings, Calendar, Inbox, Notifications, Meetings and Settings are gated inside Connect using the existing Zustand auth token.

## Backend authentication
`connectAuthenticate` delegates token validation to the existing `requireAuth` middleware. It rejects missing/invalid numeric SkillSwap user IDs and only then adds `req.user.id` for Connect route handlers. No second JWT secret or account store is introduced.

## API contract
The Connect UI calls the following backend route groups: activities, host profile, bookings, conversations/messages, notifications, calendar/ICS and meeting access. The included Express router declares corresponding handlers.

## Deliberately not claimed as production-complete
- Public Jitsi room names are not provider-authenticated.
- Credit charges are not enabled by this patch.
- Database migration and real-account end-to-end tests remain deployment steps.
