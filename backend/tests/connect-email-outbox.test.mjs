import test from "node:test";
import assert from "node:assert/strict";
import { processConnectEmailOutbox, renderConnectEmail } from "../src/connect/workers/connect-email-outbox.js";

test("Connect email template escapes untrusted user content", () => {
  const mail = renderConnectEmail("new_message", {
    title: "<script>alert(1)</script>",
    body: "Hello & goodbye",
  }, "<b>Host</b>");
  assert.match(mail.html, /&lt;script&gt;/);
  assert.match(mail.html, /Hello &amp; goodbye/);
  assert.doesNotMatch(mail.html, /<script>/);
  assert.equal(mail.subject, "You have a new SkillSwap Connect message");
});

test("outbox worker delivers claimed message and marks it sent", async () => {
  const updates = [];
  const job = {
    id: "job-1",
    user_id: "participant-2",
    event_type: "new_message",
    payload: { title: "New message", body: "Host replied" },
    attempts: 1,
  };
  const client = {
    async query(sql) {
      if (sql.includes("WITH picked")) return { rows: [job] };
      return { rows: [], rowCount: 0 };
    },
    release() {},
  };
  const pool = {
    async connect() { return client; },
    async query(sql, values) { updates.push({ sql, values }); return { rows: [], rowCount: 1 }; },
  };
  let delivered;
  const result = await processConnectEmailOutbox({
    pool,
    resolveUserEmail: async id => ({ email: `${id}@example.test`, name: "Participant" }),
    sendEmail: async message => { delivered = message; },
  });
  assert.deepEqual(result, { claimed: 1, sent: 1, failed: 0, skipped: 0 });
  assert.equal(delivered.to, "participant-2@example.test");
  assert.ok(updates.some(x => x.sql.includes("status='sent'")));
});

test("outbox worker retries provider failures", async () => {
  const updates = [];
  const job = {
    id: "job-2", user_id: "host-1", event_type: "booking_request",
    payload: { title: "Booking", body: "Request" }, attempts: 1,
  };
  const pool = {
    async connect() {
      return { async query(sql) { return sql.includes("WITH picked") ? { rows: [job] } : { rows: [] }; }, release() {} };
    },
    async query(sql, values) { updates.push({ sql, values }); return { rows: [] }; },
  };
  const result = await processConnectEmailOutbox({
    pool,
    resolveUserEmail: async () => ({ email: "host@example.test" }),
    sendEmail: async () => { throw new Error("provider down"); },
  });
  assert.equal(result.failed, 1);
  assert.ok(updates.some(x => x.values?.[1] === "pending"));
});
