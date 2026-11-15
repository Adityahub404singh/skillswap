# SkillSwap Connect — Master End-to-End Flow

This master flow expands the supplied flowchart into the full host, participant, shared-session,
notification, calendar, trust/safety and failure paths. It follows the currently supplied Connect
backend contract and existing E2E tests. Items marked **planned/manual verification** are not
claimed as implemented until verified against the live app and database.

## 1. End-to-end flowchart

```mermaid
flowchart TD
    START([Start]) --> OPEN[Open SkillSwap Connect]
    OPEN --> AUTH{Authenticated?}
    AUTH -- No --> LOGIN[Login / Sign up]
    LOGIN --> VERIFY[Verify existing SkillSwap user session]
    VERIFY --> AUTHOK{Valid token?}
    AUTHOK -- No --> LOGINERR[Show auth error; retry login]
    LOGINERR --> LOGIN
    AUTH -- Yes --> DASH[Connect dashboard]
    AUTHOK -- Yes --> DASH
    DASH --> ROLE{Choose role / action}

    subgraph HOST["HOST / CREATOR FLOW"]
      H0[Open Host Dashboard] --> H1[Create Activity]
      H1 --> H2[Enter title, description, category, cover]
      H2 --> H3[Set date, time, timezone, duration]
      H3 --> H4[Choose session type: standard / 1:1 / group / webinar / mentorship / Q&A / meetup]
      H4 --> H5[Choose delivery: online / offline / hybrid]
      H5 --> H6[Set capacity, seats, registration deadline]
      H6 --> H7[Set free or credit price]
      H7 --> H8[Choose instant booking or host approval]
      H8 --> H9[Add agenda, FAQs, cancellation policy]
      H9 --> H10[Save draft]
      H10 --> H11{Preview valid?}
      H11 -- No --> H2
      H11 -- Yes --> H12[Publish activity]
      H12 --> H13[Generate public activity URL]
      H13 --> H14[Share activity]
      H14 --> H15[Receive booking request / instant booking]
      H15 --> H16[Open Host Bookings]
      H16 --> H17{Booking pending approval?}
      H17 -- Yes --> H18[Review participant and request]
      H18 --> H19{Approve?}
      H19 -- No --> H20[Reject booking]
      H20 --> H21[Notify participant]
      H19 -- Yes --> H22[Approve booking; recheck capacity]
      H17 -- No --> H23[Instant booking already confirmed]
      H22 --> H24[Booking confirmed]
      H23 --> H24
      H24 --> H25[Open booking details / participant chat]
      H25 --> H26[Prepare session / share permitted joining details]
      H26 --> H27[Host joins session]
      H27 --> H28[Conduct session]
      H28 --> H29[Mark / complete session]
      H29 --> H30[Review participant]
      H16 --> HM[Manage booking]
      HM --> HMC{Host action}
      HMC -->|Cancel| HC[Cancel booking / release capacity]
      HMC -->|Reschedule| HR[Propose new date/time]
      HMC -->|Report| HP[Submit report]
      HR --> HR2[Participant accepts or rejects]
      HR2 -->|Accept| HRA[Update booking and calendar]
      HR2 -->|Reject| HRN[Keep original schedule]
    end

    subgraph PARTICIPANT["PARTICIPANT / LEARNER FLOW"]
      P0[Explore activities] --> P1[Search / filter / sort]
      P1 --> P2[Open activity details]
      P2 --> P3[Review host profile, availability, format, price, seats]
      P3 --> P4{Can book?}
      P4 -- No --> PERR[Show reason: full / deadline passed / unavailable / unsupported credits]
      P4 -- Yes --> P5[Choose seats / add note / request slot]
      P5 --> P6{Booking mode}
      P6 -- Instant --> P7[Create confirmed booking]
      P6 -- Host approval --> P8[Create pending request]
      P8 --> P9[Wait for host decision]
      P9 --> P10{Host decision}
      P10 -- Rejected --> P11[Receive rejection notice]
      P10 -- Approved --> P7
      P7 --> P12[Booking details]
      P12 --> P13[Open private or group conversation]
      P13 --> P14[Message host / participants]
      P14 --> P15[Receive replies and read receipts]
      P12 --> P16[Calendar / ICS]
      P12 --> P17[Receive reminders: 24h / 1h / 15m]
      P12 --> P18[Join session when eligible]
      P18 --> P19[Attend session]
      P19 --> P20[Complete session]
      P20 --> P21[Review host]
      P12 --> PM[Manage booking]
      PM --> PMC{Participant action}
      PMC -->|Cancel| PC[Cancel booking]
      PMC -->|Reschedule| PR[Propose new date/time]
      PMC -->|Report| PP[Report activity / issue]
      PR --> PR2[Host accepts or rejects]
      PR2 -->|Accept| PRA[Update booking and calendar]
      PR2 -->|Reject| PRN[Keep original schedule]
    end

    ROLE -->|Host| H0
    ROLE -->|Participant| P0
    H24 --> SHARED
    P7 --> SHARED
    subgraph SHARED["SHARED BOOKING / SESSION LIFECYCLE"]
      SHARED --> TYPE{Session type}
      TYPE -->|One-to-one| PRIVATE[Dedicated booking room + private conversation]
      TYPE -->|Group / other multi-member| GROUP[Activity-wide shared room + group conversation]
      PRIVATE --> ACCESS[Authorize host and booking participant]
      GROUP --> ACCESS
      ACCESS --> MEET{Private Jitsi/JaaS configured?}
      MEET -- Yes --> JWT[Issue member-scoped JWT join URL]
      MEET -- No --> NOJOIN[Do not expose private join URL; show provider not configured]
      JWT --> SESSION[Session starts]
      SESSION --> ENDSESSION[Session ends]
      NOJOIN --> SESSION
      ENDSESSION --> STATE[Complete / cancel / no-show state]
      STATE --> FEEDBACK[Reviews and reports]
    end

    subgraph PLATFORM["PLATFORM SERVICES"]
      EVENT[Booking / message / lifecycle event] --> NOTIF[In-app notification]
      EVENT --> OUTBOX[Transactional email outbox]
      OUTBOX --> WORKER[Background worker claims job]
      WORKER --> EMAIL[Send email with appointment details and ICS]
      WORKER --> RETRY{Provider failed?}
      RETRY -- Yes --> BACKOFF[Retry with backoff / mark failed]
      RETRY -- No --> SENT[Mark sent]
      EVENT --> REM[Create 24h / 1h / 15m reminders]
      REM --> DUE[Worker checks due reminders]
      DUE --> REMSEND[Send reminder / update status]
      EVENT --> CAL[Calendar JSON + ICS export]
      EVENT --> AUDIT[Persist status / timestamps]
    end

    H24 --> EVENT
    P7 --> EVENT
    P14 --> EVENT
    HC --> EVENT
    PC --> EVENT
    HR --> EVENT
    PR --> EVENT
    ENDSESSION --> EVENT
```

## 2. Role-by-role journey

### Host / creator
1. Authenticate using the existing SkillSwap account.
2. Create a draft; validate required fields and schedule.
3. Preview privately; ensure draft is not publicly discoverable.
4. Publish; confirm public detail and host profile listing.
5. Receive instant bookings or pending approval requests.
6. View booking list; only the host can access the activity's booking management.
7. Approve/reject pending requests. Approval must recheck seat capacity atomically.
8. Communicate with participants through the conversation attached to the booking/activity.
9. Reschedule or cancel; ensure participant receives updates and calendar is consistent.
10. Join only through an authorized meeting response; complete session and leave feedback.

### Participant / learner
1. Authenticate using the existing SkillSwap account.
2. Explore only published activities; search/filter and inspect detail.
3. Check host, schedule, timezone, format, remaining seats, deadline and price.
4. Submit a booking. Instant mode confirms immediately; approval mode remains pending.
5. View own booking and shared conversation; cannot read other users' bookings/messages.
6. Receive notification, email (if SMTP configured), calendar event and reminders.
7. Join only when a confirmed booking and valid meeting authorization exist.
8. Cancel or propose a reschedule; the other party's acceptance is required for a time change.
9. Complete the session and submit a review/report when eligible.

## 3. Session variants and access rules

| Variant | Room / conversation expectation | Key validation |
|---|---|---|
| One-to-one | Per-booking private room and conversation | Only host + that participant |
| Group / webinar / mentorship / Q&A / meetup | Shared activity room and group conversation | Only active confirmed members |
| Offline | No online join CTA; location details | Correct attendance mode and calendar |
| Hybrid | Online join details plus location | UI must clearly distinguish modes |

The supplied backend notes specifically document one-to-one versus shared group behavior. Other session types should be verified against the live implementation before assuming they have distinct room behavior.

## 4. Failure and exception paths
- Invalid/expired token → 401; do not show protected data.
- Non-owner draft preview/edit → deny without leaking draft content.
- Draft/unpublished/cancelled activity → absent from public discovery/detail.
- Duplicate active booking → reject; do not create a second booking.
- Full capacity → reject new confirmation; do not oversell.
- Approval after seats become full → reject approval after locked capacity recheck.
- Host booking self-request → reject.
- Credit-priced booking without wallet adapter → fail closed (HTTP 501); never deduct credits or create a false confirmation.
- Non-member reads conversation/meeting → 403 (or safe 404 where resource ownership is intentionally hidden).
- Cancelled booking → meeting access revoked and calendar item removed.
- SMTP/Jitsi provider outage → booking state remains durable; email retries, private join URL is not fabricated.
- Invalid reschedule time → validation error; proposed time does not overwrite the confirmed time until accepted.
- Malformed IDs/body/oversized messages → safe validation error; no stack trace or data mutation.

## 5. Test status and limits
The test pack contains existing backend tests copied from the supplied backend archive:
- `connect-complete.unit.test.mjs` — email content, HTML escaping and no unauthorized meeting CTA.
- `connect-hardening.e2e.test.mjs` — public discovery, auth, draft privacy, ownership, bookings, capacity, conversation privacy, meeting access, calendar/ICS, reviews, reports, notifications, unpublish/republish, approval/rejection, reschedule and cancellation.
- `connect-group-flow.e2e.test.mjs` — two participants share group room and conversation; read receipt is recorded.

These E2E tests require a running API and three distinct accounts/tokens (host, participant A, participant B/stranger). They have **not** been run against the user's live Neon database in this environment. A test being present is not proof it passed.

## 6. Run tests

From the backend folder:

```powershell
npm run check:connect
npm run test:connect:unit

$env:CONNECT_BASE_URL="http://localhost:3001/api/connect"
$env:CONNECT_HOST_TOKEN="HOST_USER_BEARER_TOKEN"
$env:CONNECT_PARTICIPANT_TOKEN="PARTICIPANT_A_BEARER_TOKEN"
$env:CONNECT_STRANGER_TOKEN="PARTICIPANT_B_BEARER_TOKEN"

npm run test:connect:e2e
```

Use test accounts, not production user accounts. E2E creates test activities and attempts application-level cancellation in cleanup. Keep a backup and run against staging where possible. Do not paste real bearer tokens into chat or commit them to Git.

## 7. Pre-production checklist
- [ ] Both SQL migrations applied in order and `connect_reminders` exists.
- [ ] `npm run check:connect` passes.
- [ ] `npm run test:connect:unit` passes.
- [ ] E2E run passes with three independent test users.
- [ ] Group flow run passes with two distinct participants.
- [ ] Frontend host flow and participant flow manually tested in desktop and mobile.
- [ ] API base URL points to the intended backend in dev and production.
- [ ] SMTP credentials verified; outbox sent/failed states observed.
- [ ] JaaS/private Jitsi JWT verified with the real provider; no public room used for private sessions.
- [ ] Credit booking remains visibly unavailable until wallet ledger adapter is implemented.
- [ ] Confirmed cancellation/reschedule/calendar/reminder behavior checked on both accounts.
- [ ] No private booking, conversation, notification, or meeting data leaks to the stranger account.
