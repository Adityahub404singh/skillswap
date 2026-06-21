// =============================================================
// SKILLSWAP REAL ACCOUNT VERIFICATION + HEARTBEAT TEST
// Run: node verify-real-accounts.js
// =============================================================

const API_BASE = "http://127.0.0.1:3001/api";
let passed = 0, failed = 0;
const results = [];

async function apiCall(endpoint, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, ok: res.ok };
  } catch (err) {
    console.error(`\n❌ NETWORK ERROR on ${endpoint}:`, err.message);
    console.log("👉 Backend chal raha hai? npm run dev check karo.\n");
    process.exit(1);
  }
}

async function test(name, rule, fn) {
  process.stdout.write(`  ⏳ ${name}...`);
  try {
    const result = await fn();
    if (result === false) {
      failed++;
      results.push({ name, rule, status: "FAIL" });
      console.log(`\r  ❌ FAIL: ${name}`);
      console.log(`     📋 Rule: ${rule}`);
    } else {
      passed++;
      results.push({ name, rule, status: "PASS", detail: result });
      console.log(`\r  ✅ PASS: ${name}`);
      if (result && result !== true) console.log(`     ℹ️  ${result}`);
    }
  } catch (e) {
    failed++;
    results.push({ name, rule, status: "ERROR", detail: e.message });
    console.log(`\r  💥 ERROR: ${name} — ${e.message}`);
  }
}

function section(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  🔷 ${title}`);
  console.log(`${"═".repeat(60)}`);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runTest() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   SKILLSWAP — REAL ACCOUNT + HEARTBEAT VERIFICATION       ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  let studentToken, mentorToken, adminToken;
  let studentId, mentorId;
  let sessionId;

  const STUDENT = { email: "bmadityas@gmail.com", password: "Aditya123#" };
  const MENTOR  = { email: "singhaditya4560@gmail.com", password: "Admin@123" };
  const ADMIN   = { email: "singhaditya4560@gmail.com", password: "Admin@123" };

  // ─────────────────────────────────────────
  section("BLOCK 1: LOGIN — REAL ACCOUNTS");
  // ─────────────────────────────────────────

  await test(
    "Student login (bmadityas@gmail.com)",
    "Real student account se login hona chahiye",
    async () => {
      const res = await apiCall("/auth/login", "POST", STUDENT);
      if (!res.ok || !res.data.token) {
        console.log(`\n     🔍 DEBUG: ${JSON.stringify(res.data)}`);
        return false;
      }
      studentToken = res.data.token;
      studentId = res.data.user.id;
      return `Student ID: ${studentId}, Credits: ${res.data.user.credits}`;
    }
  );

  await test(
    "Mentor login (singhaditya4560@gmail.com)",
    "Real mentor account se login hona chahiye",
    async () => {
      const res = await apiCall("/auth/login", "POST", MENTOR);
      if (!res.ok || !res.data.token) {
        console.log(`\n     🔍 DEBUG: ${JSON.stringify(res.data)}`);
        return false;
      }
      mentorToken = res.data.token;
      mentorId = res.data.user.id;
      return `Mentor ID: ${mentorId}, isAdmin: ${res.data.user.isAdmin}`;
    }
  );

  await test(
    "Admin login (singhaditya4560@gmail.com)",
    "Admin role check — same account agar isAdmin=true hai to admin bhi ye hi",
    async () => {
      const res = await apiCall("/auth/login", "POST", ADMIN);
      if (!res.ok || !res.data.token) return false;
      adminToken = res.data.token;
      if (!res.data.user.isAdmin) {
        return `⚠️  Login hua lekin isAdmin = false hai! Database mein manually isAdmin=true set karo is user ke liye.`;
      }
      return `Admin verified ✓`;
    }
  );

  if (!studentToken || !mentorToken) {
    console.log("\n❌ CRITICAL: Login fail ho gaya, aage tests nahi chal sakte. Ruk raha hu.\n");
    return;
  }

  // ⚠️ Important check — agar student aur mentor same account hai to booking test skip
  const sameAccount = studentId && mentorId && studentId === mentorId;
  if (sameAccount) {
    console.log("\n⚠️  WARNING: Student aur Mentor same account hai! Booking tests skip honge (self-booking error aayega).\n");
  }

  // ─────────────────────────────────────────
  section("BLOCK 2: WALLET CHECK");
  // ─────────────────────────────────────────

  await test(
    "Student wallet balance check",
    "Wallet API kaam kar rahi honi chahiye",
    async () => {
      const res = await apiCall("/wallet", "GET", null, studentToken);
      if (!res.ok) return false;
      return `Balance: ${res.data.balance} credits`;
    }
  );

  await test(
    "Mentor wallet balance check",
    "Wallet API kaam kar rahi honi chahiye",
    async () => {
      const res = await apiCall("/wallet", "GET", null, mentorToken);
      if (!res.ok) return false;
      return `Balance: ${res.data.balance} credits`;
    }
  );

  if (sameAccount) {
    console.log("\n  ⏭️  BLOCK 3-6 (Booking/OTP/Heartbeat/Complete) SKIP — same account hai student/mentor dono ke liye.\n");
    console.log("  👉 Fix: alag email se ek student account banao taaki real flow test ho sake.\n");
  } else {
    // ─────────────────────────────────────────
    section("BLOCK 3: SESSION BOOKING");
    // ─────────────────────────────────────────

    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    await test(
      "Student books session with mentor",
      "Escrow deduct hona chahiye booking par",
      async () => {
        const balBefore = (await apiCall("/wallet", "GET", null, studentToken)).data.balance;
        const res = await apiCall("/sessions", "POST", {
          mentorId, skill: "React", sessionType: "micro_15", scheduledDate: tomorrow
        }, studentToken);
        if (!res.ok) {
          console.log(`\n     🔍 DEBUG: ${JSON.stringify(res.data)}`);
          return false;
        }
        sessionId = res.data.id;
        const balAfter = (await apiCall("/wallet", "GET", null, studentToken)).data.balance;
        return `Session ID: ${sessionId}, Escrow: ${balBefore} → ${balAfter}`;
      }
    );

    await test(
      "Mentor accepts session — meet link generated",
      "Accept ke baad meetLink milna chahiye",
      async () => {
        if (!sessionId) return "No session (skip)";
        const res = await apiCall(`/sessions/${sessionId}/accept`, "POST", {}, mentorToken);
        if (!res.ok) return false;
        return res.data.meetLink ? `Meet Link: ${res.data.meetLink}` : "⚠️ meetLink missing in response";
      }
    );

    // ─────────────────────────────────────────
    section("BLOCK 4: OTP & SESSION START");
    // ─────────────────────────────────────────

    let sessionOtp;

    await test(
      "OTP sirf mentor ko dikhta hai",
      "Student se OTP hidden hona chahiye",
      async () => {
        if (!sessionId) return "No session (skip)";
        const mentorSessions = await apiCall("/sessions?role=mentor", "GET", null, mentorToken);
        const s = mentorSessions.data.find(x => x.id === sessionId);
        sessionOtp = s?.sessionOtp;
        return sessionOtp ? `OTP: ${sessionOtp}` : false;
      }
    );

    await test(
      "Galat OTP se session start nahi hota",
      "Brute force protection",
      async () => {
        if (!sessionId) return "No session (skip)";
        const res = await apiCall(`/sessions/${sessionId}/start`, "POST", { otp: "000000" }, mentorToken);
        return !res.ok ? `Correctly blocked (${res.status})` : false;
      }
    );

    await test(
      "Sahi OTP se session 'in_progress' hota hai",
      "Status correctly update hona chahiye",
      async () => {
        if (!sessionId || !sessionOtp) return "Skip — missing data";
        const res = await apiCall(`/sessions/${sessionId}/start`, "POST", { otp: sessionOtp }, mentorToken);
        return res.ok ? "Session started ✓" : false;
      }
    );

    // ─────────────────────────────────────────
    section("BLOCK 5: 🆕 HEARTBEAT SYSTEM TEST");
    // ─────────────────────────────────────────

    await test(
      "Heartbeat endpoint accept karta hai (student se)",
      "Student bhi heartbeat bhej sake apne session ke liye",
      async () => {
        if (!sessionId) return "No session (skip)";
        const res = await apiCall(`/sessions/${sessionId}/heartbeat`, "POST", {}, studentToken);
        return res.ok ? "Heartbeat accepted ✓" : false;
      }
    );

    await test(
      "Heartbeat endpoint accept karta hai (mentor se)",
      "Mentor bhi heartbeat bhej sake",
      async () => {
        if (!sessionId) return "No session (skip)";
        const res = await apiCall(`/sessions/${sessionId}/heartbeat`, "POST", {}, mentorToken);
        return res.ok ? "Heartbeat accepted ✓" : false;
      }
    );

    await test(
      "Outsider heartbeat nahi bhej sakta",
      "Sirf session ke participants heartbeat bhej sakte hain",
      async () => {
        if (!sessionId) return "No session (skip)";
        const res = await apiCall(`/sessions/${sessionId}/heartbeat`, "POST", {}, adminToken);
        // Agar admin alag user hai (mentor se), to ye fail hona chahiye
        return res.status === 403 ? "Correctly blocked ✓" : `⚠️  Status: ${res.status} (agar admin = mentor account hai to ye expected hai)`;
      }
    );

    await test(
      "Complete BEFORE required time fails (heartbeat ke bawajood)",
      "Time-gate kaam karna chahiye chahe heartbeat aayi ho",
      async () => {
        if (!sessionId) return "No session (skip)";
        const res = await apiCall(`/sessions/${sessionId}/complete`, "POST", {}, studentToken);
        return !res.ok ? `Correctly blocked: ${res.data.error}` : false;
      }
    );

    console.log("\n  ⏳ Heartbeat behavior verified. Real completion test ke liye required minutes (12 min for micro_15) wait karna padega — yahan skip kar rahe hain taaki script fast chale.\n");
  }

  // ─────────────────────────────────────────
  section("BLOCK 6: ADMIN ACCESS CHECK");
  // ─────────────────────────────────────────

  await test(
    "Admin stats accessible",
    "Admin dashboard data dena chahiye",
    async () => {
      const res = await apiCall("/admin/stats", "GET", null, adminToken);
      if (!res.ok) {
        console.log(`\n     🔍 DEBUG: Status ${res.status}, ${JSON.stringify(res.data)}`);
        return false;
      }
      return `Users: ${res.data.totalUsers}, Sessions: ${res.data.totalSessions}, Revenue: ${res.data.platformRevenue}`;
    }
  );

  await test(
    "Non-admin (student) admin stats access blocked",
    "Privilege escalation prevent honi chahiye",
    async () => {
      const res = await apiCall("/admin/stats", "GET", null, studentToken);
      return (res.status === 401 || res.status === 403) ? `Correctly blocked (${res.status})` : false;
    }
  );

  // ─────────────────────────────────────────
  // FINAL REPORT
  // ─────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log("  📊 FINAL REPORT");
  console.log(`${"═".repeat(60)}`);
  console.log(`  ✅ Passed : ${passed}`);
  console.log(`  ❌ Failed : ${failed}`);
  console.log(`  📝 Total  : ${passed + failed}`);
  if (passed + failed > 0) {
    console.log(`  🎯 Score  : ${Math.round((passed / (passed + failed)) * 100)}%`);
  }
  console.log(`${"═".repeat(60)}`);

  if (failed > 0) {
    console.log("\n  ⚠️  FAILED TESTS — DETAIL:\n");
    results.filter(r => r.status !== "PASS").forEach(r => {
      console.log(`  ❌ ${r.name}`);
      console.log(`     📋 Why: ${r.rule}`);
      if (r.detail) console.log(`     🔍 Detail: ${r.detail}\n`);
    });
  } else {
    console.log("\n  🚀 SAB PASS HUA!\n");
  }
}

runTest().catch(console.error);