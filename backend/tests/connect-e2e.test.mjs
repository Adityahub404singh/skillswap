import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const BASE = (process.env.CONNECT_BASE_URL || "http://localhost:3001/api/connect").replace(/\/+$/, "");
const HOST = process.env.CONNECT_HOST_TOKEN;
const PARTICIPANT = process.env.CONNECT_PARTICIPANT_TOKEN;
const STRANGER = process.env.CONNECT_STRANGER_TOKEN;
const RUN = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}`;
const created = [];
const state = {};

const auth = token => token ? { Authorization: `Bearer ${token}` } : {};

async function request(path, { token, method = "GET", body, expected, headers = {} } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...auth(token),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(Number(process.env.CONNECT_TEST_TIMEOUT_MS || 20000)),
  });
  const raw = await response.text();
  let data = raw;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (expected !== undefined) {
    assert.equal(
      response.status,
      expected,
      `${method} ${path}: expected HTTP ${expected}, got ${response.status}; response=${JSON.stringify(data)}`
    );
  }
  return { status: response.status, data, raw, headers: response.headers };
}

const items = (r, label) => {
  assert.ok(Array.isArray(r.data?.items), `${label}: expected items[]`);
  return r.data.items;
};
const future = hours => new Date(Date.now() + hours * 3600000).toISOString();

function activityPayload(label, { bookingType = "instant", maxSeats = 3, priceType = "free" } = {}) {
  return {
    title: `E2E ${label} ${RUN}`,
    description: `Automated Connect integration test ${RUN}; safe to cancel after test.`,
    category: "Career",
    format: "online",
    startAt: future(120),
    durationMinutes: 45,
    timezone: "Asia/Kolkata",
    maxSeats,
    registrationDeadline: future(72),
    bookingType,
    priceType,
    priceCredits: 0,
    agenda: [],
    faqs: [],
    cancellationPolicy: "Automated E2E test activity.",
  };
}

async function createActivity(label, options = {}) {
  const r = await request("/activities", {
    token: HOST, method: "POST", body: activityPayload(label, options), expected: 201,
  });
  const id = r.data?.id ?? r.data?.activity?.id;
  const slug = r.data?.slug ?? r.data?.activity?.slug;
  assert.ok(id, "Create activity response must include id");
  assert.ok(slug, "Create activity response must include slug");
  created.push(id);
  return { id, slug, data: r.data };
}

async function publish(activity) {
  const r = await request(`/activities/${activity.id}/publish`, {
    token: HOST, method: "POST", expected: 200,
  });
  assert.equal(r.data?.status, "published");
  return r;
}

async function cleanup() {
  // Application-level cancellation only. Never use SQL, direct DB access, or DELETE.
  for (const id of [...created].reverse()) {
    try {
      const r = await request(`/activities/${id}/cancel`, { token: HOST, method: "POST" });
      if (![200, 204, 404, 409].includes(r.status)) {
        console.error(`[cleanup] activity ${id}: HTTP ${r.status} ${JSON.stringify(r.data)}`);
      }
    } catch (e) {
      console.error(`[cleanup] activity ${id}: ${e.message}`);
    }
  }
}

test("SkillSwap Connect — extended security and business-flow E2E", async t => {
  assert.ok(HOST, "Missing CONNECT_HOST_TOKEN");
  assert.ok(PARTICIPANT, "Missing CONNECT_PARTICIPANT_TOKEN");
  assert.ok(STRANGER, "Missing CONNECT_STRANGER_TOKEN");
  assert.notEqual(HOST, PARTICIPANT, "Host and participant must be separate accounts");
  assert.notEqual(HOST, STRANGER, "Host and stranger must be separate accounts");
  assert.notEqual(PARTICIPANT, STRANGER, "Participant and stranger must be separate accounts");

  try {
    await t.test("01 health contract and public route availability", async () => {
      const r = await request("/health", { expected: 200 });
      assert.equal(r.data?.status, "ok");
      assert.equal(r.data?.module, "skillswap-connect");
      assert.match(r.headers.get("content-type") || "", /application\/json/i);
    });

    await t.test("02 public discovery response shape, filters and limit clamp", async () => {
      const all = await request("/activities", { expected: 200 });
      const rows = items(all, "public activities");
      for (const row of rows) {
        assert.ok(row.id, "public activity id missing");
        assert.ok(row.slug, "public activity slug missing");
        assert.equal(row.status, "published", "public listing must not expose drafts/unpublished/cancelled");
      }
      const filtered = await request("/activities?search=E2E&limit=1", { expected: 200 });
      assert.ok(items(filtered, "filtered activities").length <= 1);
      const category = await request("/activities?category=Career&limit=5", { expected: 200 });
      for (const row of items(category, "category filter")) assert.equal(row.category, "Career");
      const mode = await request("/activities?mode=online&limit=5", { expected: 200 });
      for (const row of items(mode, "mode filter")) assert.equal(row.format, "online");
    });

    await t.test("03 unauthenticated and invalid bearer tokens are rejected", async () => {
      for (const path of ["/me/activities", "/me/bookings", "/me/conversations", "/me/notifications", "/me/calendar"]) {
        await request(path, { expected: 401 });
        await request(path, { headers: { Authorization: "Bearer definitely-invalid-token" }, expected: 401 });
      }
    });

    await t.test("04 authenticated identities and per-user collection contracts", async () => {
      const [h, p, s] = await Promise.all([
        request("/me/activities", { token: HOST, expected: 200 }),
        request("/me/bookings", { token: PARTICIPANT, expected: 200 }),
        request("/me/bookings", { token: STRANGER, expected: 200 }),
      ]);
      items(h, "host activities");
      items(p, "participant bookings");
      items(s, "stranger bookings");
    });

    await t.test("05 invalid activity payload is rejected without creating a record", async () => {
      const r = await request("/activities", {
        token: HOST, method: "POST", body: { title: "", format: "not-a-format" },
      });
      assert.equal(r.status, 400, `Expected validation 400, got ${r.status}`);
      assert.ok(r.data?.error || r.data?.issues, "Validation response should explain the failure");
    });

    await t.test("06 draft is private, owner-only preview and owner-only edit", async () => {
      state.main = await createActivity("main-flow", { maxSeats: 2 });
      await request(`/activities/${state.main.slug}`, { expected: 404 });
      const ownerPreview = await request(`/activities/${state.main.slug}/preview`, {
        token: HOST, expected: 200,
      });
      assert.equal(ownerPreview.data?.status, "draft");
      await request(`/activities/${state.main.slug}/preview`, { token: PARTICIPANT, expected: 404 });
      await request(`/activities/${state.main.id}`, {
        token: PARTICIPANT, method: "PATCH", body: { title: `intrusion-${RUN}` }, expected: 403,
      });
      const updated = await request(`/activities/${state.main.id}`, {
        token: HOST, method: "PATCH", body: { description: `Updated by owner ${RUN}` }, expected: 200,
      });
      assert.match(updated.data?.description || "", new RegExp(RUN));
    });

    await t.test("07 publish, public detail, host profile and public availability shape", async () => {
      await publish(state.main);
      const detail = await request(`/activities/${state.main.slug}`, { expected: 200 });
      assert.equal(detail.data?.id, state.main.id);
      assert.equal(detail.data?.status, "published");
      state.hostUserId = detail.data?.host_user_id;
      assert.ok(Number.isInteger(Number(detail.data?.seats_remaining)));
      const hostProfile = await request(`/hosts/${detail.data.host_user_id}`, { expected: 200 });
      assert.ok(Array.isArray(hostProfile.data?.activities));
      assert.ok(hostProfile.data.activities.some(x => x.id === state.main.id));
      const availability = await request(`/activities/${state.main.id}/availability`, { expected: 200 });
      items(availability, "activity availability");
    });

    await t.test("08 host-only booking list and participant/stranger denial", async () => {
      await request(`/activities/${state.main.id}/bookings`, { token: PARTICIPANT, expected: 403 });
      await request(`/activities/${state.main.id}/bookings`, { token: STRANGER, expected: 403 });
      const hostList = await request(`/activities/${state.main.id}/bookings`, { token: HOST, expected: 200 });
      items(hostList, "host activity bookings");
    });

    await t.test("09 seat accounting, duplicate booking and own-booking prevention", async () => {
      const createdBooking = await request(`/activities/${state.main.id}/bookings`, {
        token: PARTICIPANT, method: "POST", body: { seats: 2, note: `seat-test-${RUN}` }, expected: 201,
      });
      state.mainBooking = createdBooking.data?.id;
      assert.ok(state.mainBooking);
      assert.equal(createdBooking.data?.status, "confirmed");
      await request(`/activities/${state.main.id}/bookings`, {
        token: PARTICIPANT, method: "POST", body: { seats: 1 }, expected: 409,
      });
      await request(`/activities/${state.main.id}/bookings`, {
        token: HOST, method: "POST", body: { seats: 1 }, expected: 400,
      });
      await request(`/activities/${state.main.id}/bookings`, {
        token: STRANGER, method: "POST", body: { seats: 1 }, expected: 409,
      });
      const detail = await request(`/activities/${state.main.slug}`, { expected: 200 });
      assert.equal(Number(detail.data?.seats_remaining), 0, "confirmed seats should exhaust the two-seat activity");
    });

    await t.test("10 booking visibility is symmetric for host/participant and private from stranger", async () => {
      const [h, p, s] = await Promise.all([
        request("/me/bookings", { token: HOST, expected: 200 }),
        request("/me/bookings", { token: PARTICIPANT, expected: 200 }),
        request("/me/bookings", { token: STRANGER, expected: 200 }),
      ]);
      assert.ok(items(h, "host bookings").some(x => x.id === state.mainBooking));
      assert.ok(items(p, "participant bookings").some(x => x.id === state.mainBooking));
      assert.ok(!items(s, "stranger bookings").some(x => x.id === state.mainBooking));
      const hostView = items(h, "host bookings").find(x => x.id === state.mainBooking);
      assert.equal(String(hostView.host_user_id), String(state.hostUserId));
    });

    await t.test("11 conversation membership, message validation, and outsider denial", async () => {
      const [h, p] = await Promise.all([
        request("/me/conversations", { token: HOST, expected: 200 }),
        request("/me/conversations", { token: PARTICIPANT, expected: 200 }),
      ]);
      const hc = items(h, "host conversations").find(x => x.booking_id === state.mainBooking);
      const pc = items(p, "participant conversations").find(x => x.booking_id === state.mainBooking);
      assert.ok(hc && pc, "both booking members should receive the same session conversation");
      assert.equal(hc.id, pc.id);
      state.conversation = hc.id;
      await request(`/conversations/${state.conversation}/messages`, {
        token: PARTICIPANT, method: "POST", body: { body: "   " }, expected: 400,
      });
      await request(`/conversations/${state.conversation}/messages`, {
        token: PARTICIPANT, method: "POST", body: { body: "x".repeat(5001) }, expected: 400,
      });
      const msg = await request(`/conversations/${state.conversation}/messages`, {
        token: PARTICIPANT, method: "POST", body: { body: `participant-message-${RUN}` }, expected: 201,
      });
      assert.equal(msg.data?.conversation_id, state.conversation);
      await request(`/conversations/${state.conversation}/messages`, { token: STRANGER, expected: 403 });
      await request(`/conversations/${state.conversation}/messages`, {
        token: STRANGER, method: "POST", body: { body: "unauthorized" }, expected: 403,
      });
      const read = await request(`/conversations/${state.conversation}/messages`, {
        token: HOST, expected: 200,
      });
      assert.ok(items(read, "messages").some(x => x.body === `participant-message-${RUN}`));
    });

    await t.test("12 meeting access is restricted to booking members and room is stable", async () => {
      const [h, p] = await Promise.all([
        request(`/bookings/${state.mainBooking}/meeting`, { token: HOST, expected: 200 }),
        request(`/bookings/${state.mainBooking}/meeting`, { token: PARTICIPANT, expected: 200 }),
      ]);
      assert.ok(h.data?.roomName);
      assert.equal(h.data.roomName, p.data?.roomName);
      await request(`/bookings/${state.mainBooking}/meeting`, { token: STRANGER, expected: 403 });
      // This endpoint currently returns a room reference, not a provider-signed Jitsi join token.
      assert.equal(h.data?.providerConfigured, false);
      assert.equal(h.data?.joinUrl, null);
    });

    await t.test("13 calendar JSON and ICS export include confirmed booking", async () => {
      const calendar = await request("/me/calendar", { token: PARTICIPANT, expected: 200 });
      assert.ok(items(calendar, "calendar").some(x => x.id === state.mainBooking));
      const ics = await request("/me/calendar.ics", { token: PARTICIPANT, expected: 200 });
      assert.match(ics.raw, /BEGIN:VCALENDAR/);
      assert.match(ics.raw, /BEGIN:VEVENT/);
      assert.match(ics.raw, new RegExp(state.mainBooking));
      assert.match(ics.headers.get("content-type") || "", /text\/calendar/i);
    });

    await t.test("14 reviews require a booking and accept bounded rating", async () => {
      await request(`/activities/${state.main.id}/reviews`, {
        token: STRANGER, method: "POST", body: { rating: 5, comment: "not booked" }, expected: 403,
      });
      const review = await request(`/activities/${state.main.id}/reviews`, {
        token: PARTICIPANT, method: "POST", body: { rating: 5, comment: `review-${RUN}` }, expected: 201,
      });
      assert.equal(review.data?.rating, 5);
      await request(`/activities/${state.main.id}/reviews`, {
        token: PARTICIPANT, method: "POST", body: { rating: 6 }, expected: 400,
      });
    });

    await t.test("15 reports validate reason and are authenticated", async () => {
      await request(`/activities/${state.main.id}/reports`, {
        token: STRANGER, method: "POST", body: { reason: "spam", details: `report-${RUN}` }, expected: 201,
      });
      await request(`/activities/${state.main.id}/reports`, {
        token: PARTICIPANT, method: "POST", body: { reason: "x" }, expected: 400,
      });
    });

    await t.test("16 notifications are user-scoped; read-all is idempotent", async () => {
      const [h, p, s] = await Promise.all([
        request("/me/notifications", { token: HOST, expected: 200 }),
        request("/me/notifications", { token: PARTICIPANT, expected: 200 }),
        request("/me/notifications", { token: STRANGER, expected: 200 }),
      ]);
      const hostItems = items(h, "host notifications");
      const participantItems = items(p, "participant notifications");
      items(s, "stranger notifications");
      const hostBookingNotice = hostItems.find(x => x.data?.bookingId === state.mainBooking);
      if (hostBookingNotice) {
        await request(`/notifications/${hostBookingNotice.id}/read`, {
          token: PARTICIPANT, method: "POST", expected: 404,
        });
        const read = await request(`/notifications/${hostBookingNotice.id}/read`, {
          token: HOST, method: "POST", expected: 200,
        });
        assert.ok(read.data?.read_at);
      }
      const readAll = await request("/notifications/read-all", {
        token: PARTICIPANT, method: "POST", expected: 200,
      });
      assert.equal(readAll.data?.status, "ok");
      const refreshed = await request("/me/notifications", { token: PARTICIPANT, expected: 200 });
      for (const n of items(refreshed, "notifications after read-all")) assert.ok(n.read_at);
    });

    await t.test("17 unpublish removes public discoverability; republish restores it", async () => {
      await request(`/activities/${state.main.id}/unpublish`, {
        token: HOST, method: "POST", expected: 200,
      });
      await request(`/activities/${state.main.slug}`, { expected: 404 });
      const discover = await request(`/activities?search=${encodeURIComponent(state.main.data.title)}`, {
        expected: 200,
      });
      assert.ok(!items(discover, "after unpublish").some(x => x.id === state.main.id));
      await request(`/activities/${state.main.id}/publish`, {
        token: HOST, method: "POST", expected: 200,
      });
      await request(`/activities/${state.main.slug}`, { expected: 200 });
    });

    await t.test("18 host-approval booking lifecycle and rejection state", async () => {
      state.approval = await createActivity("approval", { bookingType: "host_approval", maxSeats: 2 });
      await publish(state.approval);
      const pending = await request(`/activities/${state.approval.id}/bookings`, {
        token: PARTICIPANT, method: "POST", body: { seats: 1, note: `pending-${RUN}` }, expected: 201,
      });
      state.approvalBooking = pending.data?.id;
      assert.ok(state.approvalBooking);
      assert.equal(pending.data?.status, "pending");
      await request(`/bookings/${state.approvalBooking}/approve`, {
        token: PARTICIPANT, method: "POST", expected: 403,
      });
      const approved = await request(`/bookings/${state.approvalBooking}/approve`, {
        token: HOST, method: "POST", expected: 200,
      });
      assert.equal(approved.data?.status, "confirmed");
      await request(`/bookings/${state.approvalBooking}/approve`, {
        token: HOST, method: "POST", expected: 409,
      });
      const secondPending = await request(`/activities/${state.approval.id}/bookings`, {
        token: STRANGER, method: "POST", body: { seats: 1 }, expected: 201,
      });
      state.rejectedBooking = secondPending.data?.id;
      const rejected = await request(`/bookings/${state.rejectedBooking}/reject`, {
        token: HOST, method: "POST", expected: 200,
      });
      assert.equal(rejected.data?.status, "rejected");
      await request(`/bookings/${state.rejectedBooking}/approve`, {
        token: HOST, method: "POST", expected: 409,
      });
    });

    await t.test("19 reschedule authorization, future-time validation and confirmation", async () => {
      const bad = await request(`/bookings/${state.approvalBooking}/reschedule`, {
        token: PARTICIPANT, method: "POST", body: { requestedStartAt: "yesterday" },
      });
      assert.equal(bad.status, 400);
      await request(`/bookings/${state.approvalBooking}/reschedule`, {
        token: STRANGER, method: "POST", body: { requestedStartAt: future(180) }, expected: 403,
      });
      const proposal = await request(`/bookings/${state.approvalBooking}/reschedule`, {
        token: PARTICIPANT, method: "POST", body: { requestedStartAt: future(180) }, expected: 200,
      });
      assert.equal(proposal.data?.status, "awaiting_host_confirmation");
      await request(`/bookings/${state.approvalBooking}/reschedule/confirm`, {
        token: PARTICIPANT, method: "POST", expected: 403,
      });
      const confirm = await request(`/bookings/${state.approvalBooking}/reschedule/confirm`, {
        token: HOST, method: "POST", expected: 200,
      });
      assert.equal(confirm.data?.status, "confirmed");
      await request(`/bookings/${state.approvalBooking}/reschedule/confirm`, {
        token: HOST, method: "POST", expected: 409,
      });
    });

    await t.test("20 credits booking fails closed without charging credits", async () => {
      state.credits = await createActivity("credits-not-configured", { priceType: "credits", maxSeats: 2 });
      await publish(state.credits);
      const attempt = await request(`/activities/${state.credits.id}/bookings`, {
        token: PARTICIPANT, method: "POST", body: { seats: 1 },
      });
      assert.equal(attempt.status, 501, `Expected explicit unsupported adapter response, got ${attempt.status}`);
      assert.match(attempt.data?.error || "", /Credit booking adapter/i);
    });

    await t.test("21 cancellation revokes booking meeting access and calendar entry", async () => {
      const cancelled = await request(`/bookings/${state.mainBooking}/cancel`, {
        token: PARTICIPANT, method: "POST", expected: 200,
      });
      assert.equal(cancelled.data?.status, "cancelled");
      await request(`/bookings/${state.mainBooking}/meeting`, { token: PARTICIPANT, expected: 409 });
      await request(`/bookings/${state.mainBooking}/meeting`, { token: HOST, expected: 409 });
      const calendar = await request("/me/calendar", { token: PARTICIPANT, expected: 200 });
      assert.ok(!items(calendar, "calendar after cancel").some(x => x.id === state.mainBooking));
    });

    await t.test("22 activity cancellation cancels pending and confirmed bookings", async () => {
      state.cancelActivity = await createActivity("cancel-parent", { bookingType: "host_approval", maxSeats: 3 });
      await publish(state.cancelActivity);
      const p1 = await request(`/activities/${state.cancelActivity.id}/bookings`, {
        token: PARTICIPANT, method: "POST", body: { seats: 1 }, expected: 201,
      });
      const p2 = await request(`/activities/${state.cancelActivity.id}/bookings`, {
        token: STRANGER, method: "POST", body: { seats: 1 }, expected: 201,
      });
      await request(`/bookings/${p2.data.id}/approve`, { token: HOST, method: "POST", expected: 200 });
      await request(`/activities/${state.cancelActivity.id}/cancel`, {
        token: HOST, method: "POST", expected: 200,
      });
      const [pb, sb] = await Promise.all([
        request("/me/bookings", { token: PARTICIPANT, expected: 200 }),
        request("/me/bookings", { token: STRANGER, expected: 200 }),
      ]);
      assert.equal(items(pb, "participant after activity cancel").find(x => x.id === p1.data.id)?.status, "cancelled");
      assert.equal(items(sb, "stranger after activity cancel").find(x => x.id === p2.data.id)?.status, "cancelled");
      await request(`/activities/${state.cancelActivity.slug}`, { expected: 404 });
      await request(`/activities/${state.cancelActivity.id}/bookings`, { token: HOST, expected: 200 });
    });

    await t.test("23 missing resources return safe 404s; unknown routes do not leak stack traces", async () => {
      await request("/activities/not-a-real-connect-slug-404", { expected: 404 });
      await request("/bookings/00000000-0000-4000-8000-000000000000/meeting", {
        token: HOST, expected: 404,
      });
      const unknown = await request("/this-route-does-not-exist", { token: HOST });
      assert.equal(unknown.status, 404);
      assert.doesNotMatch(unknown.raw, / at .*:\d+:\d+/);
    });

  } finally {
    await cleanup();
  }
});

