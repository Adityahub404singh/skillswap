// verify-discover-flow.js
// Run this file using: node verify-discover-flow.js
//
// 🎯 POORA FLOW TEST: 
// [Discover Tab] → [Swipe Card] → [API: Swipe Check] → [Match Modal]
//   → [Book Session] OR [Chat] → [Matches Tab (Saved)]
//
// Har step ke baad detailed text output deta hai taaki pata chale kya pass/fail hua.

const API_BASE = "http://localhost:3001/api"; // Apne port ke hisaab se change kar lena
// Agar Render backend test karna hai, isse use karo:
// const API_BASE = "https://skillswap-b59w.onrender.com/api";

// 🧠 Helper function — har API call ke liye
async function apiCall(endpoint, method = "GET", body = null, token = null, expectFail = false) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();

    if (!res.ok && !expectFail) {
      console.error(`\n❌ [API ERROR] on ${method} ${endpoint}:`, data);
      console.log("👉 HINT: Backend logs check karo, yeh request fail ho gayi!");
      process.exit(1);
    }

    return { status: res.status, data };
  } catch (err) {
    console.error(`\n❌ [NETWORK/SERVER ERROR] on ${endpoint}:`, err.message);
    console.log("👉 HINT: Backend chalu hai? Sahi port/URL hai? Pehle 'npm run dev' chalao.");
    process.exit(1);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function section(title) {
  console.log("\n" + "=".repeat(60));
  console.log(`🧪 ${title}`);
  console.log("=".repeat(60));
}

async function runDiscoverFlowTest() {
  console.log("=================================================");
  console.log("🚀 SKILLSWAP FULL FLOW TEST");
  console.log("[Discover] → [Swipe] → [Match] → [Chat/Book] → [Matches Tab]");
  console.log("=================================================");

  const rand = Math.floor(Math.random() * 100000);

  let userAToken, userBToken;
  let userAId, userBId;

  // ==========================================
  // STEP 1: DO TEST USERS BANAO (jo ek dusre ko swipe karenge)
  // ==========================================
  section("STEP 1: Test Users Registration");

  const userARes = await apiCall("/auth/register", "POST", {
    name: "Riya Swiper",
    email: `riya${rand}@test.com`,
    password: "password123",
    skillsLearn: ["Guitar", "Cooking"],
  });
  userAToken = userARes.data.token;
  userAId = userARes.data.user.id;
  console.log(`✅ User A "Riya" registered → ID: ${userAId}`);
  console.log(`   Token: ${userAToken.substring(0, 20)}...`);

  const userBRes = await apiCall("/auth/register", "POST", {
    name: "Sam Mentor",
    email: `sam${rand}@test.com`,
    password: "password123",
    skillsTeach: ["Guitar", "Music Theory"],
    pricePerHour: 30,
  });
  userBToken = userBRes.data.token;
  userBId = userBRes.data.user.id;
  console.log(`✅ User B "Sam" registered → ID: ${userBId}`);
  console.log(`   Token: ${userBToken.substring(0, 20)}...`);

  // ==========================================
  // STEP 2: [Discover Tab] — DISCOVER PROFILES FETCH KARO
  // ==========================================
  section("STEP 2: [Discover Tab] GET /discover/profiles");

  const profilesRes = await apiCall("/discover/profiles", "GET", null, userAToken);
  console.log(`✅ Status: ${profilesRes.status}`);
  console.log(`✅ Total profiles returned: ${profilesRes.data.length}`);

  const foundSam = profilesRes.data.find((p) => p.id === userBId);
  if (foundSam) {
    console.log(`✅ User B "Sam" mila discover list mein!`);
    console.log(`   Name: ${foundSam.name}`);
    console.log(`   Bio: ${foundSam.bio || "(no bio)"}`);
    console.log(`   Skills Teach: ${JSON.stringify(foundSam.skillsTeach)}`);
    console.log(`   Sessions Completed: ${foundSam.sessionsCompleted}`);
    console.log(`   Avg Rating: ${foundSam.averageRating}`);
  } else {
    console.log(`⚠️ User B "Sam" discover list mein nahi mila.`);
  }

  // 🔒 SECURITY CHECK: apna khud ka profile list mein nahi aana chahiye
  const selfInList = profilesRes.data.find((p) => p.id === userAId);
  console.log(
    selfInList
      ? `❌ BUG: User A apna khud ka profile dekh raha hai discover list mein!`
      : `✅ Security OK: User A apna khud ka profile nahi dekh raha.`
  );

  // ==========================================
  // STEP 3: [Swipe Card] — USER A, USER B KO "LIKE" SWIPE KARTA HAI (one-sided abhi)
  // ==========================================
  section("STEP 3: [Swipe Card] User A swipes RIGHT (like) on User B");

  const swipe1 = await apiCall(
    "/discover/swipe",
    "POST",
    { swipedOnId: userBId, action: "like" },
    userAToken
  );
  console.log(`✅ [API: Swipe Check] Status: ${swipe1.status}`);
  console.log(`   isMatch: ${swipe1.data.isMatch} (expected: false, Sam ne abhi reverse swipe nahi kiya)`);

  console.log(
    swipe1.data.isMatch === false
      ? `✅ Sahi behavior: One-sided like se match nahi hona chahiye.`
      : `❌ BUG: One-sided like par hi match ho gaya — yeh galat hai!`
  );

  // ==========================================
  // STEP 4: DOBARA DISCOVER KARO — SWIPED USER REPEAT NAHI HONA CHAHIYE
  // ==========================================
  section("STEP 4: Discover Dobara — Already-Swiped User Exclude Hona Chahiye");

  const profilesAfterSwipe = await apiCall("/discover/profiles", "GET", null, userAToken);
  const samStillThere = profilesAfterSwipe.data.find((p) => p.id === userBId);

  console.log(
    !samStillThere
      ? `✅ Sahi: "Sam" ab discover list mein nahi dikh raha (already swiped).`
      : `❌ BUG: "Sam" abhi bhi discover list mein hai jabki already swipe ho chuka hai!`
  );

  // ==========================================
  // STEP 5: [Match Modal] — USER B BHI USER A KO "LIKE" KARTA HAI → MUTUAL MATCH
  // ==========================================
  section("STEP 5: [API: Swipe Check] User B swipes RIGHT on User A → Match Expected");

  const swipe2 = await apiCall(
    "/discover/swipe",
    "POST",
    { swipedOnId: userAId, action: "like" },
    userBToken
  );
  console.log(`✅ Status: ${swipe2.status}`);
  console.log(`   isMatch: ${swipe2.data.isMatch} (expected: true 🎉)`);
  console.log(`   Message: ${swipe2.data.message || "(none)"}`);

  console.log(
    swipe2.data.isMatch === true
      ? `🎉 [Match Modal] WOULD TRIGGER NOW — confetti + Chat/Book buttons (frontend behavior).`
      : `❌ BUG: Mutual like ke bawajood match nahi hua — Match Modal trigger nahi hoga!`
  );

  // ==========================================
  // STEP 6: [Matches Tab (Saved)] — MATCHES LIST CHECK (dono taraf se)
  // ==========================================
  section("STEP 6: [Matches Tab] Matches List Verify (GET /discover/matches)");

  const matchesA = await apiCall("/discover/matches", "GET", null, userAToken);
  console.log(`✅ User A ki matches list — count: ${matchesA.data.length}`);
  const matchBInA = matchesA.data.find((m) => m.id === userBId);
  console.log(
    matchBInA
      ? `✅ User A ki "New Connections" row mein "Sam" dikh raha hai → Name: ${matchBInA.name}`
      : `❌ BUG: User A ki matches list mein "Sam" missing hai!`
  );

  const matchesB = await apiCall("/discover/matches", "GET", null, userBToken);
  console.log(`✅ User B ki matches list — count: ${matchesB.data.length}`);
  const matchAInB = matchesB.data.find((m) => m.id === userAId);
  console.log(
    matchAInB
      ? `✅ User B ki "New Connections" row mein "Riya" dikh raha hai → Name: ${matchAInB.name}`
      : `❌ BUG: User B ki matches list mein "Riya" missing hai!`
  );

  // ==========================================
  // STEP 7: PASS (reject) TEST — Match nahi hona chahiye
  // ==========================================
  section("STEP 7: [Swipe Card] Pass/Reject Swipe Test (action: 'pass')");

  const userCRes = await apiCall("/auth/register", "POST", {
    name: "Pass Test User",
    email: `passuser${rand}@test.com`,
    password: "password123",
  });
  const userCToken = userCRes.data.token;
  const userCId = userCRes.data.user.id;

  const passSwipe = await apiCall(
    "/discover/swipe",
    "POST",
    { swipedOnId: userCId, action: "pass" },
    userAToken
  );
  console.log(`✅ Status: ${passSwipe.status}`);
  console.log(`   isMatch: ${passSwipe.data.isMatch} (expected: false)`);
  console.log(
    passSwipe.data.isMatch === false
      ? `✅ Sahi: "pass" action se match trigger nahi hota, card hat jata hai.`
      : `❌ BUG: "pass" action ke baad bhi match ho gaya!`
  );

  // ==========================================
  // STEP 8: [Chat Now] FLOW — CONVERSATIONS LIST
  // ==========================================
  section("STEP 8: [Chat Now] → Conversations List (GET /chat/conversations)");

  const convosA = await apiCall("/chat/conversations", "GET", null, userAToken);
  console.log(`✅ Status: ${convosA.status}`);
  console.log(`✅ User A ki conversations count: ${convosA.data.length}`);

  // ==========================================
  // STEP 9: [Chat Now] — MESSAGE SEND KARO MATCH KO
  // ==========================================
  section("STEP 9: [Chat Now] Send Message (POST /chat)");

  const msgText = `Hi Sam! Main Guitar seekhna chahti hoon 🎸 (test-${rand})`;
  const sendMsgRes = await apiCall(
    "/chat",
    "POST",
    { receiverId: userBId, content: msgText },
    userAToken
  );
  console.log(`✅ Status: ${sendMsgRes.status}`);
  console.log(`✅ Message bheja gaya: "${msgText}"`);

  // ==========================================
  // STEP 10: MESSAGE FETCH KARO (dono taraf se check)
  // ==========================================
  section("STEP 10: Fetch Messages (GET /chat/:otherUserId) — Dono Taraf Se");

  const messagesForA = await apiCall(`/chat/${userBId}`, "GET", null, userAToken);
  console.log(`✅ User A ki taraf se messages count: ${messagesForA.data.length}`);
  const sentMsgFound = messagesForA.data.find((m) => (m.content || "").includes(`test-${rand}`));
  console.log(
    sentMsgFound
      ? `✅ Bheja gaya message list mein mil gaya: "${sentMsgFound.content}"`
      : `❌ BUG: Bheja gaya message User A ki list mein nahi mila!`
  );

  const messagesForB = await apiCall(`/chat/${userAId}`, "GET", null, userBToken);
  console.log(`✅ User B (Sam) ki taraf se messages count: ${messagesForB.data.length}`);
  const receivedMsgFound = messagesForB.data.find((m) => (m.content || "").includes(`test-${rand}`));
  console.log(
    receivedMsgFound
      ? `✅ Sam ko message receive hua: "${receivedMsgFound.content}"`
      : `❌ BUG: Sam ki taraf se message dikh hi nahi raha — chat ek-tarfa toot gaya!`
  );

  // ==========================================
  // STEP 11: [Book Session] FLOW — Match se directly session book karna
  // ==========================================
  section("STEP 11: [Book Session] → POST /sessions (Riya books with Sam)");

  const bookRes = await apiCall(
    "/sessions",
    "POST",
    {
      mentorId: userBId,
      skill: "Guitar",
      sessionType: "standard",
      scheduledDate: new Date(Date.now() + 86400000).toISOString(), // kal ki date
    },
    userAToken
  );
  console.log(`✅ Status: ${bookRes.status}`);
  console.log(`✅ Session booked → Session ID: ${bookRes.data.id}`);
  console.log(`   Skill: ${bookRes.data.skill}`);
  console.log(`   Status: ${bookRes.data.status} (expected: "requested")`);
  console.log(`   Credits charged: ${bookRes.data.creditsAmount}`);

  console.log(
    bookRes.data.status === "requested"
      ? `✅ Sahi: Booking ke baad session status "requested" hai, mentor ke accept ka wait hai.`
      : `❌ BUG: Session status expected "requested" nahi hai!`
  );

  // ==========================================
  // STEP 12: MENTOR (Sam) SESSION ACCEPT KARTA HAI
  // ==========================================
  section("STEP 12: Mentor Accepts Session (POST /sessions/:id/accept)");

  const acceptRes = await apiCall(`/sessions/${bookRes.data.id}/accept`, "POST", {}, userBToken);
  console.log(`✅ Status: ${acceptRes.status}`);
  console.log(`   Message: ${acceptRes.data.message}`);

  // ==========================================
  // STEP 13: [Matches Tab] — Booking ke baad bhi match list mein dikhte rehna chahiye
  // ==========================================
  section("STEP 13: [Matches Tab] Booking Ke Baad Bhi Match Persist Hona Chahiye");

  const finalMatchesA = await apiCall("/discover/matches", "GET", null, userAToken);
  const stillMatched = finalMatchesA.data.find((m) => m.id === userBId);
  console.log(
    stillMatched
      ? `✅ Sahi: Booking ke baad bhi "Sam" Matches Tab mein dikh raha hai.`
      : `❌ BUG: Booking ke baad "Sam" Matches list se gayab ho gaya!`
  );

  // ==========================================
  // STEP 14: SECURITY — BINA TOKEN KE REQUESTS REJECT HONI CHAHIYE
  // ==========================================
  section("STEP 14: Security Check — No Token Requests Should FAIL (401)");

  const noTokenProfiles = await apiCall("/discover/profiles", "GET", null, null, true);
  console.log(`Discover (no token) → Status: ${noTokenProfiles.status} (expected: 401)`);
  console.log(noTokenProfiles.status === 401 ? "✅ Pass" : "❌ BUG: bina token access mil raha hai!");

  const noTokenMatches = await apiCall("/discover/matches", "GET", null, null, true);
  console.log(`Matches (no token) → Status: ${noTokenMatches.status} (expected: 401)`);
  console.log(noTokenMatches.status === 401 ? "✅ Pass" : "❌ BUG: bina token access mil raha hai!");

  const noTokenChat = await apiCall("/chat/conversations", "GET", null, null, true);
  console.log(`Chat conversations (no token) → Status: ${noTokenChat.status} (expected: 401)`);
  console.log(noTokenChat.status === 401 ? "✅ Pass" : "❌ BUG: bina token access mil raha hai!");

  const noTokenBook = await apiCall(
    "/sessions",
    "POST",
    { mentorId: userBId, skill: "Guitar", scheduledDate: new Date(Date.now() + 86400000).toISOString() },
    null,
    true
  );
  console.log(`Book Session (no token) → Status: ${noTokenBook.status} (expected: 401)`);
  console.log(noTokenBook.status === 401 ? "✅ Pass" : "❌ BUG: bina token booking ho gayi!");

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log("\n==========================================================");
  console.log("📋 FLOW SUMMARY");
  console.log("==========================================================");
  console.log(`👤 User A (Riya) → ID: ${userAId}, Email: riya${rand}@test.com`);
  console.log(`👤 User B (Sam)  → ID: ${userBId}, Email: sam${rand}@test.com`);
  console.log(`👤 User C (Pass) → ID: ${userCId}, Email: passuser${rand}@test.com`);
  console.log(`📅 Session Booked → ID: ${bookRes.data.id}`);
  console.log("----------------------------------------------------------");
  console.log("[Discover Tab]        → Profiles fetch                ✅ Tested");
  console.log("[Swipe Card]          → One-sided like (no match)     ✅ Tested");
  console.log("                      → Already-swiped exclusion      ✅ Tested");
  console.log("[API: Swipe Check]    → Mutual like → isMatch=true    ✅ Tested");
  console.log("[Match Modal]         → Trigger condition verified    ✅ Tested");
  console.log("[Matches Tab (Saved)] → Match shows both sides        ✅ Tested");
  console.log("[Swipe Card]          → Pass/Reject swipe              ✅ Tested");
  console.log("[Chat]                → Conversations list             ✅ Tested");
  console.log("[Chat]                → Send + Receive message         ✅ Tested");
  console.log("[Book Session]        → Booking + Mentor accept        ✅ Tested");
  console.log("[Matches Tab]         → Persists after booking         ✅ Tested");
  console.log("Security              → No-token 401 checks (x4)       ✅ Tested");
  console.log("==========================================================");
  console.log("🚀🔥 FULL DISCOVER → SWIPE → MATCH → CHAT/BOOK FLOW COMPLETE!");
  console.log("==========================================================\n");
}

runDiscoverFlowTest();