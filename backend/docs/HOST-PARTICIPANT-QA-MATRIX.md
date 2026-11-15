# Host + Participant QA Matrix

Legend: **Automated** = covered by included backend tests; **Manual** = requires frontend/live-provider validation; **Blocked** = feature intentionally unavailable until integration/configuration.

| Area | Host-side checks | Participant-side checks | Stranger / negative checks | Status in supplied test pack |
|---|---|---|---|---|
| Login/session | Existing token authenticates host | Existing token authenticates learner | Missing/invalid bearer returns 401 | Automated |
| Activity create | Valid draft created; invalid payload rejected | Cannot create/edit host-owned activity | Cannot preview another user's draft | Automated |
| Publish/discover | Publish, unpublish, republish | Explore published activity and detail | Draft/unpublished/cancelled hidden | Automated |
| Activity ownership | Host can edit and view bookings | Participant cannot edit activity | Stranger cannot access host booking list | Automated |
| Booking instant | Host sees booking; capacity updates | Learner receives confirmed booking | Duplicate/self-book/full-capacity blocked | Automated |
| Booking approval | Host approve/reject; capacity rechecked | Participant request pending; sees decision | Participant cannot approve; stranger cannot view | Automated |
| Booking list | Host sees own hosted bookings | Participant sees own sent bookings | Third user sees neither party's booking | Automated |
| Chat | Host receives conversation and can read messages | Participant sends and receives messages | Non-member cannot list/send | Automated |
| Group room | Host can access shared group room | Two participants resolve same room/chat | Non-member cannot access room | Group E2E |
| One-to-one room | Host + participant share one private booking room | Participant sees only own booking room | Stranger denied | Automated |
| Read receipts | Host read state is recorded | Participant read state is recorded | Other member's receipt data not exposed | Partial / group E2E |
| Calendar / ICS | Host sees hosted confirmed session | Participant gets JSON and ICS event | Stranger must not see event | Partial: participant JSON/ICS tested |
| Notifications | Host receives booking notice and can mark own notice read | Participant receives notices and read-all works | Cross-user read attempt denied | Automated |
| Email | Host/participant appointment email includes only authorized link | Recipient-specific details/ICS | No CTA if no authorized join URL | Unit tests; live SMTP manual |
| Reminders | Host schedule changes reconcile reminders | 24h/1h/15m reminders created for confirmed booking | Cancelled bookings should not receive reminders | DB/runtime manual verification |
| Reschedule | Host accepts/rejects participant proposal | Participant proposes and sees outcome | Stranger cannot propose/confirm | Partial: accept path and stranger denial |
| Cancellation | Host cancels activity; dependent bookings cancelled | Participant cancels booking; access/calendar revoked | Stranger cannot cancel | Automated |
| Session completion | Host completes session and reviews participant | Participant completes and reviews host | Review without eligible booking denied | Partial: review eligibility/rating tested |
| Reports | Host can report abuse | Participant can report activity | Invalid reason rejected; auth required | Automated |
| Credit booking | Host sees credit-priced activity state | Booking returns explicit unsupported response | No silent debit or false confirmation | Blocked by design; HTTP 501 tested |
| Online join security | JWT link only when JaaS config exists | Authorized participant receives own join URL | Stranger denied; public meet.jit.meeting not allowed | Provider validation manual |
| Offline / hybrid | Host location and attendance instructions correct | Participant sees correct location/no false join CTA | No unauthorized details | Manual |
| Responsive UI | Host dashboard, booking actions, calendar on mobile | Explore, booking, inbox on mobile | Protected screens remain protected | Manual |

## Additional manual scenarios to execute in browser
1. Host A creates and publishes an online group activity.
2. Participant B and Participant C book; Host A sees both, B/C see only their own booking records.
3. B sends a group message; C and A see it; verify read receipts after each opens the thread.
4. Cancel B only; verify B loses room access while C remains in group chat/room.
5. Host reschedules a confirmed booking; participant accepts, then verify both calendars and reminder schedule.
6. Repeat with participant proposing reschedule and host rejecting; original confirmed time must remain.
7. Create offline activity; verify there is no online join button.
8. Disable SMTP in staging; booking still confirms, outbox records retry/failure and no duplicate booking is created.
9. Configure JaaS in staging; verify JWT claims, domain, room, expiry and member scope with provider.
10. Test mobile viewport, keyboard navigation, loading, empty, error, success and retry states.
