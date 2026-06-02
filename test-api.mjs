// SkillSwap API Auto Tester
// Run: node test-api.mjs

const BASE_URL = process.argv[2] || "http://localhost:3000";

let passed = 0;
let failed = 0;
const results = [];

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(emoji, label, msg) {
  const line = `${emoji} ${label}: ${msg}`;
  results.push(line);
  console.log(line);
}

async function req(method, path, body, token) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: { error: e.message } };
  }
}

function check(label, condition, got) {
  if (condition) {
    passed++;
    log("✅", label, typeof got === "object" ? JSON.stringify(got).slice(0, 80) : got);
  } else {
    failed++;
    log("❌", label, typeof got === "object" ? JSON.stringify(got).slice(0, 120) : got);
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🚀 SkillSwap API Test — ${BASE_URL}\n${"─".repeat(60)}`);

  // ── 1. Health check ──────────────────────────────────────────
  console.log("\n📋 [1] SERVER HEALTH");
  const health = await req("GET", "/health");
  check("Server is running", health.status !== 0, `HTTP ${health.status}`);

  // ── 2. Register Student ──────────────────────────────────────
  console.log("\n📋 [2] REGISTRATION");
  const ts = Date.now();
  const studentEmail = `student_${ts}@test.com`;
  const mentorEmail  = `mentor_${ts}@test.com`;
  const mentor2Email = `mentor2_${ts}@test.com`;

  const regStudent = await req("POST", "/auth/register", {
    name: "Test Student", email: studentEmail,
    password: "Test@1234",
    skillsTeach: ["Music", "Chess"],
    skillsLearn: ["Python", "JavaScript"],
  });
  check("Student register", regStudent.status === 201, regStudent.data);
  const studentToken = regStudent.data.token;
  const studentId    = regStudent.data.user?.id;

  // ── 3. Register Mentor ───────────────────────────────────────
  const regMentor = await req("POST", "/auth/register", {
    name: "Python Expert", email: mentorEmail,
    password: "Test@1234",
    skillsTeach: ["Python", "DSA", "JavaScript"],
    skillsLearn: ["Music"],
  });
  check("Mentor register", regMentor.status === 201, regMentor.data);
  const mentorToken = regMentor.data.token;
  const mentorId    = regMentor.data.user?.id;

  // ── 4. Register Mentor 2 ─────────────────────────────────────
  const regMentor2 = await req("POST", "/auth/register", {
    name: "JS Expert", email: mentor2Email,
    password: "Test@1234",
    skillsTeach: ["JavaScript", "Web Dev"],
    skillsLearn: ["Chess"],
  });
  check("Mentor2 register", regMentor2.status === 201, regMentor2.data);
  const mentor2Id = regMentor2.data.user?.id;

  // ── 5. Login ─────────────────────────────────────────────────
  console.log("\n📋 [3] LOGIN");
  const login = await req("POST", "/auth/login", {
    email: studentEmail, password: "Test@1234",
  });
  check("Login works", login.status === 200 && login.data.token, `token: ${login.data.token?.slice(0,20)}...`);

  const wrongLogin = await req("POST", "/auth/login", {
    email: studentEmail, password: "wrongpass",
  });
  check("Wrong password blocked", wrongLogin.status === 401, `HTTP ${wrongLogin.status}`);

  // ── 6. Auth protection ───────────────────────────────────────
  console.log("\n📋 [4] AUTH PROTECTION");
  const noAuth = await req("GET", "/matching/Python");
  check("No token blocked", noAuth.status === 401, `HTTP ${noAuth.status}`);

  const fakeToken = await req("GET", "/matching/Python", null, "fake.token.here");
  check("Fake token blocked", fakeToken.status === 401, `HTTP ${fakeToken.status}`);

  // ── 7. Matching ──────────────────────────────────────────────
  console.log("\n📋 [5] MATCHING SYSTEM");
  const matchPython = await req("GET", "/matching/Python", null, studentToken);
  check("Python matching works", matchPython.status === 200 && Array.isArray(matchPython.data), `${matchPython.data?.length} mentors found`);
  check("Mentors have matchScore", matchPython.data?.[0]?.matchScore > 0, `top score: ${matchPython.data?.[0]?.matchScore}`);
  check("Self not in results", !matchPython.data?.some(m => m.user?.id === studentId), "student excluded");
  check("Sorted by score", matchPython.data?.length < 2 || matchPython.data?.[0]?.matchScore >= matchPython.data?.[1]?.matchScore, "descending order");
  check("Has badges", matchPython.data?.[0]?.hasOwnProperty("isTopRated"), JSON.stringify(matchPython.data?.[0]));

  const matchJS = await req("GET", "/matching/JavaScript", null, studentToken);
  check("JavaScript matching works", matchJS.status === 200, `${matchJS.data?.length} mentors`);

  const matchEmpty = await req("GET", "/matching/XyzUnknownSkill999", null, studentToken);
  check("Unknown skill returns empty", matchEmpty.status === 200 && matchEmpty.data?.length === 0, `${matchEmpty.data?.length} mentors`);

  // ── 8. Booking Fraud Prevention ──────────────────────────────
  console.log("\n📋 [6] BOOKING FRAUD PREVENTION");
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const pastDate   = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Self booking
  const selfBook = await req("POST", "/sessions", {
    mentorId: studentId, skill: "Python",
    scheduledDate: futureDate, duration: 60, creditsAmount: 50,
  }, studentToken);
  check("Self-booking blocked", selfBook.status === 400, selfBook.data?.message);

  // Past date
  const pastBook = await req("POST", "/sessions", {
    mentorId: mentorId, skill: "Python",
    scheduledDate: pastDate, duration: 60, creditsAmount: 50,
  }, studentToken);
  check("Past date blocked", pastBook.status === 400, pastBook.data?.message);

  // Wrong skill
  const wrongSkill = await req("POST", "/sessions", {
    mentorId: mentorId, skill: "Cooking",
    scheduledDate: futureDate, duration: 60, creditsAmount: 50,
  }, studentToken);
  check("Wrong skill blocked", wrongSkill.status === 400, wrongSkill.data?.message);

  // Credits cap test (DSA max=180, request 500)
  const capBook = await req("POST", "/sessions", {
    mentorId: mentorId, skill: "DSA",
    scheduledDate: futureDate, duration: 60, creditsAmount: 500,
  }, studentToken);
  // Should succeed but cap credits at 180
  if (capBook.status === 201) {
    check("Credits capped at SKILL_MAX", capBook.data?.creditsAmount <= 180, `creditsAmount: ${capBook.data?.creditsAmount}`);
  } else {
    check("Credits cap test", false, capBook.data);
  }

  // ── 9. Normal Booking ────────────────────────────────────────
  console.log("\n📋 [7] SESSION BOOKING");
  const book = await req("POST", "/sessions", {
    mentorId: mentorId, skill: "Python",
    scheduledDate: futureDate, duration: 60, creditsAmount: 50,
  }, studentToken);
  check("Session booked", book.status === 201, `session id: ${book.data?.id}`);
  check("Status is requested", book.data?.status === "requested", book.data?.status);
  check("Has meetLink", !!book.data?.meetLink, book.data?.meetLink);
  check("Has mentor info", !!book.data?.mentor?.name, book.data?.mentor?.name);
  check("Has student info", !!book.data?.student?.name, book.data?.student?.name);
  const sessionId = book.data?.id;

  // Check credits deducted
  const meAfterBook = await req("GET", "/auth/me", null, studentToken);
  check("Credits deducted", (meAfterBook.data?.credits ?? 200) < 200, `credits: ${meAfterBook.data?.credits}`);

  // ── 10. Session Access Control ───────────────────────────────
  console.log("\n📋 [8] SESSION ACCESS CONTROL");

  // Wrong mentor trying to accept
  const wrongAccept = await req("POST", `/sessions/${sessionId}/accept`, {}, regMentor2.data.token);
  check("Wrong mentor cant accept", wrongAccept.status === 403, `HTTP ${wrongAccept.status}`);

  // Student cant accept own session
  const studentAccept = await req("POST", `/sessions/${sessionId}/accept`, {}, studentToken);
  check("Student cant accept", studentAccept.status === 403, `HTTP ${studentAccept.status}`);

  // ── 11. Accept & Complete Flow ───────────────────────────────
  console.log("\n📋 [9] SESSION LIFECYCLE");
  const accept = await req("POST", `/sessions/${sessionId}/accept`, {}, mentorToken);
  check("Mentor accepts session", accept.status === 200, `status: ${accept.data?.status}`);
  check("Status is accepted", accept.data?.status === "accepted", accept.data?.status);

  // Double accept
  const doubleAccept = await req("POST", `/sessions/${sessionId}/accept`, {}, mentorToken);
  check("Double accept blocked", doubleAccept.status === 400, doubleAccept.data?.error);

  // Start session
  const start = await req("POST", `/sessions/${sessionId}/start`, {}, mentorToken);
  check("Session started", start.status === 200, `status: ${start.data?.status}`);

  // Complete session
  const complete = await req("POST", `/sessions/${sessionId}/complete`, {}, mentorToken);
  check("Session completed", complete.status === 200, `status: ${complete.data?.status}`);
  check("Status is completed", complete.data?.status === "completed", complete.data?.status);

  // Double complete
  const doubleComplete = await req("POST", `/sessions/${sessionId}/complete`, {}, mentorToken);
  check("Double complete blocked", doubleComplete.status === 400, doubleComplete.data?.error);

  // ── 12. Cancel & Refund ──────────────────────────────────────
  console.log("\n📋 [10] CANCEL & REFUND");
  const book2 = await req("POST", "/sessions", {
    mentorId: mentorId, skill: "Python",
    scheduledDate: futureDate, duration: 60, creditsAmount: 30,
  }, studentToken);
  const session2Id = book2.data?.id;

  const cancel = await req("POST", `/sessions/${session2Id}/cancel`, {}, studentToken);
  check("Session cancelled", cancel.status === 200, `status: ${cancel.data?.status}`);

  const meAfterCancel = await req("GET", "/auth/me", null, studentToken);
  check("Credits refunded after cancel", (meAfterCancel.data?.credits ?? 0) > (meAfterBook.data?.credits ?? 0), `credits: ${meAfterCancel.data?.credits}`);

  // ── 13. Get Sessions ─────────────────────────────────────────
  console.log("\n📋 [11] GET SESSIONS");
  const mySessions = await req("GET", "/sessions", null, studentToken);
  check("Get sessions works", mySessions.status === 200 && Array.isArray(mySessions.data), `${mySessions.data?.length} sessions`);
  check("Sessions have mentor info", !!mySessions.data?.[0]?.mentor, "mentor populated");

  const mentorSessions = await req("GET", "/sessions?role=mentor", null, mentorToken);
  check("Mentor sessions filter works", mentorSessions.status === 200, `${mentorSessions.data?.length} sessions`);

  // ── 14. Negotiate ────────────────────────────────────────────
  console.log("\n📋 [12] PRICE NEGOTIATION");
  const book3 = await req("POST", "/sessions", {
    mentorId: mentorId, skill: "Python",
    scheduledDate: futureDate, duration: 60, creditsAmount: 50,
  }, studentToken);
  const session3Id = book3.data?.id;

  const negotiate = await req("POST", `/sessions/${session3Id}/negotiate`, { proposedPrice: 999 }, studentToken);
  check("Negotiate works", negotiate.status === 200, `price: ${negotiate.data?.negotiatedPrice}`);
  check("Price capped at 250", negotiate.data?.negotiatedPrice <= 250, `price: ${negotiate.data?.negotiatedPrice}`);

  // ── 15. Summary ──────────────────────────────────────────────
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  
  if (failed === 0) {
    console.log("🎉 ALL TESTS PASSED! Backend is working correctly.\n");
  } else {
    console.log(`⚠️  ${failed} tests failed. Check the ❌ above.\n`);
  }
}

run().catch(e => {
  console.error("Fatal error:", e.message);
  process.exit(1);
});
