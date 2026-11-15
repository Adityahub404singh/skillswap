# SkillSwap Connect – manual acceptance test plan

## Preconditions

- Existing SkillSwap backend and frontend build successfully.
- Connect schema migration has been explicitly applied to the intended existing database.
- Two distinct test accounts exist: Host A and Participant B.

## Discovery and privacy

1. Open `/connect` and `/connect/explore` while logged out. Published activities should load.
2. Open a published activity URL while logged out. It should show public details but not a registration action that bypasses login.
3. Create a draft as Host A. Its preview should load for Host A only.
4. Open the same draft URL as Participant B and while logged out. It must not reveal draft details.

## Booking

5. Publish an activity as Host A with future start time and seats.
6. Register as Participant B. Instant booking should become confirmed; host-approval booking should remain pending.
7. Refresh the event page as Participant B. It should show the current booking state and not offer a second registration.
8. Try registering again through the API. It should reject duplicate active bookings.
9. Create two pending bookings for the final seat(s) and approve them concurrently. At most the available capacity may become confirmed.
10. Cancel a booking as either participant. It should be cancelled and its meeting row should no longer be scheduled.

## Messaging and notifications

11. After a confirmed booking, both accounts should see the same conversation in Inbox.
12. Send messages from both accounts. A user who is not a conversation member must receive 403 when trying to read or send.
13. Verify notifications are private to their recipient and can be marked read.

## Activity cancellation and calendar

14. Host A cancels an activity with pending/confirmed bookings. Active bookings and meetings should be cancelled and affected participants should receive a notification.
15. Confirmed bookings should appear in `/connect/calendar` and the `.ics` export. Cancelled bookings should not.

## Security and regression

16. A non-host must not edit, publish, unpublish, cancel, preview, or list host bookings for another user's activity.
17. A non-member must not read/send messages in another conversation.
18. A user must not access another user's private notifications.
19. Existing SkillSwap login, logout, profile, payments and normal routes must still work.
20. Run frontend and backend build commands in `CONNECT_INSTALLATION.md`.

Record failures with request path, status code and sanitized response. Never include bearer tokens or database URLs in bug reports.
