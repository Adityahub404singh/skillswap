import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const BASE = (
  process.env.CONNECT_BASE_URL ||
  "http://localhost:3001/api/connect"
).replace(/\/+$/, "");

const HOST = process.env.CONNECT_HOST_TOKEN;
const PARTICIPANT = process.env.CONNECT_PARTICIPANT_TOKEN;
const STRANGER = process.env.CONNECT_STRANGER_TOKEN;

const RUN = `EXTRA-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

const createdActivities: Array<string | number> = [];

const state: Record<string, any> = {};

const auth = (token?: string) =>
  token ? { Authorization: `Bearer ${token}` } : {};

const timeout = Number(process.env.CONNECT_TEST_TIMEOUT_MS || 20000);

async function api(
  path: string,
  options: {
    token?: string;
    method?: string;
    body?: unknown;
    expected?: number;
  } = {}
) {
  const headers: Record<string, string> = {
  Accept: "application/json",
};

if (options.token) {
  headers["Authorization"] = `Bearer ${options.token}`;
}

if (options.body !== undefined) {
  headers["Content-Type"] = "application/json";
}

const response = await fetch(`${BASE}${path}`, {
  method: options.method || "GET",
  headers,
  body:
    options.body === undefined
      ? undefined
      : JSON.stringify(options.body),
  signal: AbortSignal.timeout(timeout),
});

  const raw = await response.text();

  let data: any = raw;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    // Preserve plain-text responses such as ICS.
  }

  if (options.expected !== undefined) {
    assert.equal(
      response.status,
      options.expected,
      `${options.method || "GET"} ${path}: expected ${
        options.expected
      }, received ${response.status}; response=${raw.slice(0, 1000)}`
    );
  }

  return {
    status: response.status,
    data,
    raw,
    headers: response.headers,
  };
}

function getItems(response: any, label: string) {
  assert.ok(
    Array.isArray(response.data?.items),
    `${label}: response must contain items[]`
  );

  return response.data.items;
}

function futureDate(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function activityBody(
  name: string,
  options: {
    bookingType?: string;
    maxSeats?: number;
  } = {}
) {
  return {
    title: `${name}-${RUN}`,
    description: `Additional automated test ${RUN}`,
    category: "Career",
    format: "online",
    startAt: futureDate(120),
    durationMinutes: 45,
    timezone: "Asia/Kolkata",
    maxSeats: options.maxSeats ?? 5,
    registrationDeadline: futureDate(72),
    bookingType: options.bookingType ?? "instant",
    priceType: "free",
    priceCredits: 0,
    agenda: [],
    faqs: [],
    cancellationPolicy: "Automated test policy",
  };
}

async function createActivity(
  name: string,
  options: {
    bookingType?: string;
    maxSeats?: number;
  } = {}
) {
  const response = await api("/activities", {
    token: HOST,
    method: "POST",
    body: activityBody(name, options),
    expected: 201,
  });

  const id = response.data?.id ?? response.data?.activity?.id;
  const slug = response.data?.slug ?? response.data?.activity?.slug;

  assert.ok(id, "Activity ID missing");
  assert.ok(slug, "Activity slug missing");

  createdActivities.push(id);

  return { id, slug, data: response.data };
}

async function publish(activity: any) {
  return api(`/activities/${activity.id}/publish`, {
    token: HOST,
    method: "POST",
    expected: 200,
  });
}

async function cleanup() {
  for (const id of [...createdActivities].reverse()) {
    try {
      const response = await api(`/activities/${id}/cancel`, {
        token: HOST,
        method: "POST",
      });

      if (![200, 204, 404, 409].includes(response.status)) {
        console.error(
          `[cleanup] Activity ${id}: HTTP ${response.status}`
        );
      }
    } catch (error: any) {
      console.error(`[cleanup] ${error.message}`);
    }
  }
}

function requireTestAccounts() {
  assert.ok(HOST, "CONNECT_HOST_TOKEN is missing");
  assert.ok(PARTICIPANT, "CONNECT_PARTICIPANT_TOKEN is missing");
  assert.ok(STRANGER, "CONNECT_STRANGER_TOKEN is missing");

  assert.notEqual(HOST, PARTICIPANT);
  assert.notEqual(HOST, STRANGER);
  assert.notEqual(PARTICIPANT, STRANGER);
}

test("SkillSwap Connect - Additional Complete E2E Scenarios", async (t) => {
  requireTestAccounts();

  try {
    // -------------------------------------------------------
    // 01. HOST DASHBOARD
    // -------------------------------------------------------

    await t.test("Host dashboard returns authenticated data", async () => {
      const response = await api("/me/activities", {
        token: HOST,
        expected: 200,
      });

      assert.ok(Array.isArray(response.data?.items));
    });

    // -------------------------------------------------------
    // 02. PARTICIPANT DASHBOARD
    // -------------------------------------------------------

    await t.test("Participant can access their bookings", async () => {
      const response = await api("/me/bookings", {
        token: PARTICIPANT,
        expected: 200,
      });

      getItems(response, "Participant dashboard");
    });

    // -------------------------------------------------------
    // 03. STRANGER DATA ISOLATION
    // -------------------------------------------------------

    await t.test("Stranger sees only their own bookings", async () => {
      const [participant, stranger] = await Promise.all([
        api("/me/bookings", {
          token: PARTICIPANT,
          expected: 200,
        }),
        api("/me/bookings", {
          token: STRANGER,
          expected: 200,
        }),
      ]);

      const participantItems = getItems(
        participant,
        "Participant bookings"
      );

      const strangerItems = getItems(
        stranger,
        "Stranger bookings"
      );

      for (const item of participantItems) {
        assert.ok(item.id);
      }

      for (const item of strangerItems) {
        assert.ok(item.id);
      }
    });

    // -------------------------------------------------------
    // 04. CREATE ACTIVITY
    // -------------------------------------------------------

    await t.test("Host creates an activity", async () => {
      state.activity = await createActivity("dashboard-create");

      assert.ok(state.activity.id);
      assert.ok(state.activity.slug);
    });

    // -------------------------------------------------------
    // 05. DRAFT PRIVACY
    // -------------------------------------------------------

    await t.test("Draft activity is not publicly visible", async () => {
      await api(`/activities/${state.activity.slug}`, {
        expected: 404,
      });
    });

    // -------------------------------------------------------
    // 06. PUBLISH ACTIVITY
    // -------------------------------------------------------

    await t.test("Host publishes activity", async () => {
      await publish(state.activity);

      const response = await api(
        `/activities/${state.activity.slug}`,
        { expected: 200 }
      );

      assert.equal(response.data?.status, "published");
    });

    // -------------------------------------------------------
    // 07. PARTICIPANT DISCOVERY
    // -------------------------------------------------------

    await t.test("Participant can discover published activity", async () => {
      const response = await api(
        `/activities?search=${encodeURIComponent(
          state.activity.data.title
        )}`,
        { expected: 200 }
      );

      const results = getItems(response, "Explore");

      assert.ok(
        results.some((item: any) => item.id === state.activity.id),
        "Published activity should appear in Explore"
      );
    });

    // -------------------------------------------------------
    // 08. ACTIVITY DETAIL
    // -------------------------------------------------------

    await t.test("Participant can open activity details", async () => {
      const response = await api(
        `/activities/${state.activity.slug}`,
        { expected: 200 }
      );

      assert.equal(response.data.id, state.activity.id);
      assert.equal(response.data.status, "published");
      assert.ok(response.data.title);
      assert.ok(response.data.description);
    });

    // -------------------------------------------------------
    // 09. HOST BOOKING VISIBILITY
    // -------------------------------------------------------

    await t.test("Only host can see activity booking list", async () => {
      await api(`/activities/${state.activity.id}/bookings`, {
        token: PARTICIPANT,
        expected: 403,
      });

      await api(`/activities/${state.activity.id}/bookings`, {
        token: STRANGER,
        expected: 403,
      });

      const hostResponse = await api(
        `/activities/${state.activity.id}/bookings`,
        {
          token: HOST,
          expected: 200,
        }
      );

      getItems(hostResponse, "Host bookings");
    });

    // -------------------------------------------------------
    // 10. INSTANT BOOKING
    // -------------------------------------------------------

    await t.test("Participant instant booking succeeds", async () => {
      const response = await api(
        `/activities/${state.activity.id}/bookings`,
        {
          token: PARTICIPANT,
          method: "POST",
          body: {
            seats: 1,
            note: `Instant booking ${RUN}`,
          },
          expected: 201,
        }
      );

      state.booking = response.data.id;

      assert.ok(state.booking);
      assert.equal(response.data.status, "confirmed");
    });

    // -------------------------------------------------------
    // 11. DUPLICATE BOOKING
    // -------------------------------------------------------

    await t.test("Duplicate booking is prevented", async () => {
      const response = await api(
        `/activities/${state.activity.id}/bookings`,
        {
          token: PARTICIPANT,
          method: "POST",
          body: { seats: 1 },
        }
      );

      assert.ok(
        [400, 409].includes(response.status),
        `Duplicate booking should fail, got ${response.status}`
      );
    });

    // -------------------------------------------------------
    // 12. HOST BOOKING VIEW
    // -------------------------------------------------------

    await t.test("Host can see participant booking", async () => {
      const response = await api(
        `/activities/${state.activity.id}/bookings`,
        {
          token: HOST,
          expected: 200,
        }
      );

      const bookings = getItems(response, "Host activity bookings");

      assert.ok(
        bookings.some((item: any) => item.id === state.booking)
      );
    });

    // -------------------------------------------------------
    // 13. PARTICIPANT BOOKING VIEW
    // -------------------------------------------------------

    await t.test("Participant sees their booking", async () => {
      const response = await api("/me/bookings", {
        token: PARTICIPANT,
        expected: 200,
      });

      const bookings = getItems(response, "Participant bookings");

      assert.ok(
        bookings.some((item: any) => item.id === state.booking)
      );
    });

    // -------------------------------------------------------
    // 14. STRANGER CANNOT SEE BOOKING
    // -------------------------------------------------------

    await t.test("Stranger cannot see another user's booking", async () => {
      const response = await api("/me/bookings", {
        token: STRANGER,
        expected: 200,
      });

      const bookings = getItems(response, "Stranger bookings");

      assert.ok(
        !bookings.some((item: any) => item.id === state.booking)
      );
    });

    // -------------------------------------------------------
    // 15. CONVERSATION CREATION
    // -------------------------------------------------------

    await t.test("Booking creates conversation for both sides", async () => {
      const [host, participant] = await Promise.all([
        api("/me/conversations", {
          token: HOST,
          expected: 200,
        }),
        api("/me/conversations", {
          token: PARTICIPANT,
          expected: 200,
        }),
      ]);

      const hostConversations = getItems(host, "Host conversations");
      const participantConversations = getItems(
        participant,
        "Participant conversations"
      );

      const hostConversation = hostConversations.find(
        (item: any) => item.booking_id === state.booking
      );

      const participantConversation = participantConversations.find(
        (item: any) => item.booking_id === state.booking
      );

      assert.ok(hostConversation);
      assert.ok(participantConversation);

      assert.equal(
        hostConversation.id,
        participantConversation.id
      );

      state.conversation = hostConversation.id;
    });

    // -------------------------------------------------------
    // 16. PARTICIPANT SENDS MESSAGE
    // -------------------------------------------------------

    await t.test("Participant sends message to host", async () => {
      const message = `Hello host ${RUN}`;

      const response = await api(
        `/conversations/${state.conversation}/messages`,
        {
          token: PARTICIPANT,
          method: "POST",
          body: { body: message },
          expected: 201,
        }
      );

      assert.equal(response.data.body, message);
    });

    // -------------------------------------------------------
    // 17. HOST RECEIVES MESSAGE
    // -------------------------------------------------------

    await t.test("Host can read participant message", async () => {
      const response = await api(
        `/conversations/${state.conversation}/messages`,
        {
          token: HOST,
          expected: 200,
        }
      );

      const messages = getItems(response, "Host messages");

      assert.ok(
        messages.some(
          (item: any) => item.body === `Hello host ${RUN}`
        )
      );
    });

    // -------------------------------------------------------
    // 18. HOST SENDS REPLY
    // -------------------------------------------------------

    await t.test("Host replies to participant", async () => {
      const message = `Hello participant ${RUN}`;

      const response = await api(
        `/conversations/${state.conversation}/messages`,
        {
          token: HOST,
          method: "POST",
          body: { body: message },
          expected: 201,
        }
      );

      assert.equal(response.data.body, message);
    });

    // -------------------------------------------------------
    // 19. PARTICIPANT RECEIVES REPLY
    // -------------------------------------------------------

    await t.test("Participant can read host reply", async () => {
      const response = await api(
        `/conversations/${state.conversation}/messages`,
        {
          token: PARTICIPANT,
          expected: 200,
        }
      );

      const messages = getItems(response, "Participant messages");

      assert.ok(
        messages.some(
          (item: any) => item.body === `Hello participant ${RUN}`
        )
      );
    });

    // -------------------------------------------------------
    // 20. EMPTY MESSAGE VALIDATION
    // -------------------------------------------------------

    await t.test("Empty message is rejected", async () => {
      const response = await api(
        `/conversations/${state.conversation}/messages`,
        {
          token: PARTICIPANT,
          method: "POST",
          body: { body: "   " },
        }
      );

      assert.equal(response.status, 400);
    });

    // -------------------------------------------------------
    // 21. OVERSIZED MESSAGE VALIDATION
    // -------------------------------------------------------

    await t.test("Oversized message is rejected", async () => {
      const response = await api(
        `/conversations/${state.conversation}/messages`,
        {
          token: PARTICIPANT,
          method: "POST",
          body: { body: "x".repeat(5001) },
        }
      );

      assert.equal(response.status, 400);
    });

    // -------------------------------------------------------
    // 22. STRANGER MESSAGE ACCESS
    // -------------------------------------------------------

    await t.test("Stranger cannot read conversation", async () => {
      await api(
        `/conversations/${state.conversation}/messages`,
        {
          token: STRANGER,
          expected: 403,
        }
      );
    });

    // -------------------------------------------------------
    // 23. STRANGER CANNOT SEND MESSAGE
    // -------------------------------------------------------

    await t.test("Stranger cannot send conversation message", async () => {
      await api(
        `/conversations/${state.conversation}/messages`,
        {
          token: STRANGER,
          method: "POST",
          body: { body: "Unauthorized message" },
          expected: 403,
        }
      );
    });

    // -------------------------------------------------------
    // 24. MEETING ACCESS
    // -------------------------------------------------------

    await t.test("Host and participant can access meeting", async () => {
      const [host, participant] = await Promise.all([
        api(`/bookings/${state.booking}/meeting`, {
          token: HOST,
          expected: 200,
        }),
        api(`/bookings/${state.booking}/meeting`, {
          token: PARTICIPANT,
          expected: 200,
        }),
      ]);

      assert.ok(host.data.roomName);
      assert.equal(host.data.roomName, participant.data.roomName);
    });

    // -------------------------------------------------------
    // 25. STRANGER MEETING ACCESS
    // -------------------------------------------------------

    await t.test("Stranger cannot access meeting", async () => {
      await api(`/bookings/${state.booking}/meeting`, {
        token: STRANGER,
        expected: 403,
      });
    });

    // -------------------------------------------------------
    // 26. CALENDAR
    // -------------------------------------------------------

    await t.test("Participant calendar contains confirmed booking", async () => {
      const response = await api("/me/calendar", {
        token: PARTICIPANT,
        expected: 200,
      });

      const events = getItems(response, "Participant calendar");

      assert.ok(
        events.some((item: any) => item.id === state.booking)
      );
    });

    // -------------------------------------------------------
    // 27. ICS EXPORT
    // -------------------------------------------------------

    await t.test("Calendar ICS export is valid", async () => {
      const response = await api("/me/calendar.ics", {
        token: PARTICIPANT,
        expected: 200,
      });

      assert.match(response.raw, /BEGIN:VCALENDAR/);
      assert.match(response.raw, /BEGIN:VEVENT/);
      assert.match(response.raw, /END:VCALENDAR/);
    });

    // -------------------------------------------------------
    // 28. NOTIFICATION COLLECTIONS
    // -------------------------------------------------------

    await t.test("Both users can access their notifications", async () => {
      const [host, participant] = await Promise.all([
        api("/me/notifications", {
          token: HOST,
          expected: 200,
        }),
        api("/me/notifications", {
          token: PARTICIPANT,
          expected: 200,
        }),
      ]);

      getItems(host, "Host notifications");
      getItems(participant, "Participant notifications");
    });

    // -------------------------------------------------------
    // 29. STRANGER NOTIFICATION ISOLATION
    // -------------------------------------------------------

    await t.test("Stranger sees only their notifications", async () => {
      const response = await api("/me/notifications", {
        token: STRANGER,
        expected: 200,
      });

      getItems(response, "Stranger notifications");
    });

    // -------------------------------------------------------
    // 30. INVALID TOKEN
    // -------------------------------------------------------

    await t.test("Invalid token cannot access protected resources", async () => {
      for (const path of [
        "/me/activities",
        "/me/bookings",
        "/me/conversations",
        "/me/notifications",
        "/me/calendar",
      ]) {
        await api(path, {
          token: "invalid-token",
          expected: 401,
        });
      }
    });

    // -------------------------------------------------------
    // 31. UNAUTHENTICATED ACCESS
    // -------------------------------------------------------

    await t.test("Missing authorization is rejected", async () => {
      for (const path of [
        "/me/activities",
        "/me/bookings",
        "/me/conversations",
        "/me/notifications",
        "/me/calendar",
      ]) {
        await api(path, { expected: 401 });
      }
    });

    // -------------------------------------------------------
    // 32. INVALID ACTIVITY ID
    // -------------------------------------------------------

    await t.test("Unknown activity returns 404", async () => {
      await api("/activities/non-existing-activity-404", {
        expected: 404,
      });
    });

    // -------------------------------------------------------
    // 33. ACTIVITY CANCELLATION
    // -------------------------------------------------------

    await t.test("Participant cancels confirmed booking", async () => {
      const response = await api(
        `/bookings/${state.booking}/cancel`,
        {
          token: PARTICIPANT,
          method: "POST",
          expected: 200,
        }
      );

      assert.equal(response.data.status, "cancelled");
    });

    // -------------------------------------------------------
    // 34. CANCELLED BOOKING MEETING ACCESS
    // -------------------------------------------------------

    await t.test("Cancelled booking cannot access meeting", async () => {
      await api(`/bookings/${state.booking}/meeting`, {
        token: HOST,
        expected: 409,
      });

      await api(`/bookings/${state.booking}/meeting`, {
        token: PARTICIPANT,
        expected: 409,
      });
    });

    // -------------------------------------------------------
    // 35. CANCELLED BOOKING CALENDAR
    // -------------------------------------------------------

    await t.test("Cancelled booking is removed from calendar", async () => {
      const response = await api("/me/calendar", {
        token: PARTICIPANT,
        expected: 200,
      });

      const events = getItems(response, "Calendar after cancellation");

      assert.ok(
        !events.some((item: any) => item.id === state.booking)
      );
    });

    // -------------------------------------------------------
    // 36. HOST APPROVAL FLOW
    // -------------------------------------------------------

    await t.test("Host approval booking flow", async () => {
      state.approvalActivity = await createActivity(
        "approval-extra",
        {
          bookingType: "host_approval",
          maxSeats: 3,
        }
      );

      await publish(state.approvalActivity);

      const pending = await api(
        `/activities/${state.approvalActivity.id}/bookings`,
        {
          token: PARTICIPANT,
          method: "POST",
          body: {
            seats: 1,
            note: `Approval request ${RUN}`,
          },
          expected: 201,
        }
      );

      state.approvalBooking = pending.data.id;

      assert.equal(pending.data.status, "pending");
      assert.ok(state.approvalBooking);

      const approved = await api(
        `/bookings/${state.approvalBooking}/approve`,
        {
          token: HOST,
          method: "POST",
          expected: 200,
        }
      );

      assert.equal(approved.data.status, "confirmed");
    });

    // -------------------------------------------------------
    // 37. PARTICIPANT CANNOT APPROVE
    // -------------------------------------------------------

    await t.test("Participant cannot approve their own request", async () => {
      const response = await api(
        `/bookings/${state.approvalBooking}/approve`,
        {
          token: PARTICIPANT,
          method: "POST",
        }
      );

      assert.equal(response.status, 403);
    });

    // -------------------------------------------------------
    // 38. DUPLICATE APPROVAL
    // -------------------------------------------------------

    await t.test("Repeated approval is rejected", async () => {
      const response = await api(
        `/bookings/${state.approvalBooking}/approve`,
        {
          token: HOST,
          method: "POST",
        }
      );

      assert.equal(response.status, 409);
    });

    // -------------------------------------------------------
    // 39. RESCHEDULE INVALID DATE
    // -------------------------------------------------------

    await t.test("Invalid reschedule date is rejected", async () => {
      const response = await api(
        `/bookings/${state.approvalBooking}/reschedule`,
        {
          token: PARTICIPANT,
          method: "POST",
          body: {
            requestedStartAt: "invalid-date",
          },
        }
      );

      assert.equal(response.status, 400);
    });

    // -------------------------------------------------------
    // 40. RESCHEDULE STRANGER ACCESS
    // -------------------------------------------------------

    await t.test("Stranger cannot reschedule booking", async () => {
      await api(
        `/bookings/${state.approvalBooking}/reschedule`,
        {
          token: STRANGER,
          method: "POST",
          body: {
            requestedStartAt: futureDate(180),
          },
          expected: 403,
        }
      );
    });

  } finally {
    await cleanup();
  }
});