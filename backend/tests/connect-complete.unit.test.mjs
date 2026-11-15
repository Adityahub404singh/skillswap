import test from "node:test";
import assert from "node:assert/strict";
import { renderConnectEmail } from "../src/connect/workers/connect-email-outbox.js";

test("Connect appointment email includes schedule, format and join link", () => {
  const rendered = renderConnectEmail("booking_confirmed", {
    title: "Booking confirmed",
    body: "Your appointment is confirmed.",
    appointment: {
      title: "Java Mock Interview",
      hostName: "Host",
      participantName: "Participant",
      startAt: "2026-11-20T10:30:00.000Z",
      timezone: "Asia/Kolkata",
      durationMinutes: 45,
      deliveryMode: "online",
      joinUrl: "https://meet.example.test/room"
    }
  }, "Participant");
  assert.match(rendered.subject, /confirmed/i);
  assert.match(rendered.text, /Java Mock Interview/);
  assert.match(rendered.text, /https:\/\/meet\.example\.test\/room/);
  assert.match(rendered.html, /Join session/);
});

test("Connect email renderer escapes untrusted HTML content", () => {
  const rendered = renderConnectEmail("new_message", {
    title: "<script>alert(1)</script>",
    body: "<img src=x onerror=alert(1)>"
  }, "<b>name</b>");
  assert.doesNotMatch(rendered.html, /<script>/i);
  assert.doesNotMatch(rendered.html, /<img/);
  assert.match(rendered.html, /&lt;script&gt;/);
});

test("Connect appointment email omits meeting CTA when no authorized join URL exists", () => {
  const rendered = renderConnectEmail("booking_confirmed", {
    title: "Confirmed",
    body: "See your booking.",
    appointment: { title: "Offline meetup", deliveryMode: "offline", location: "Campus Hall" }
  }, "Member");
  assert.match(rendered.text, /Campus Hall/);
  assert.doesNotMatch(rendered.html, /Join session/);
});
