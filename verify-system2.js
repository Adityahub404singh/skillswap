// verify-system.js
// Run this file using: node verify-system.js

const API_BASE = "http://localhost:3001/api"; 

// 🧠 Robust Helper function
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
            process.exit(1);
        }
        return { status: res.status, data };
    } catch (err) {
        console.error(`\n❌ [NETWORK ERROR] on ${endpoint}:`, err.message);
        process.exit(1);
    }
}

async function runMasterTest() {
    console.log("=================================================");
    console.log("🚀 STARTING SKILLSWAP 10x MASTER VERIFICATION SCRIPT");
    console.log("=================================================\n");

    // All variables declared once at the top level
    let studentToken, mentorToken, adminToken;
    let studentId, mentorId;
    let sessionId;
    let adminRes; // 🔥 Variable declared once

    const rand = Math.floor(Math.random() * 100000);

    // ==========================================
    // TEST 1: REGISTRATION & LOGIN
    // ==========================================
    console.log("🧪 TEST 1: User Registration & Authentication...");
    
    const s = await apiCall("/auth/register", "POST", { name: "Alice", email: `alice${rand}@t.com`, password: "password123" });
    studentToken = s.data.token;
    studentId = s.data.user.id;

    const m = await apiCall("/auth/register", "POST", { name: "Bob", email: `bob${rand}@t.com`, password: "password123", skillsTeach: ["React"] });
    mentorToken = m.data.token;
    mentorId = m.data.user.id;

    // Admin Auth
    const adminEmail = "singhaditya4560@gmail.com";
    adminRes = await apiCall("/auth/register", "POST", { name: "Admin", email: adminEmail, password: "Admin@123" }, null, true);
    
    if (adminRes.status === 409 || adminRes.status === 400) {
        adminRes = await apiCall("/auth/login", "POST", { email: adminEmail, password: "Admin@123" });
    }
    adminToken = adminRes.data.token;
    console.log("✅ Auth Setup Complete.");

    // ==========================================
    // TEST 2-13: FLOWS (Booking, Dispute, Quiz, Wallet, etc.)
    // ==========================================
    console.log("🧪 TEST 2: Referral...");
    const ref = await apiCall("/auth/referral", "GET", null, studentToken);
    console.log(`✅ Referral Link: ${ref.data.referralLink}`);

    console.log("🧪 TEST 3: Verification...");
    await apiCall("/users/me", "PATCH", { bio: "Senior Dev", pricePerHour: 100 }, mentorToken);
    await apiCall("/verification/submit", "POST", { skill: "React", proofLink: "github.com/bob" }, mentorToken);
    await apiCall("/verification/approve", "POST", { userId: mentorId, skill: "React" }, adminToken);
    console.log("✅ Verification Approved.");

    console.log("🧪 TEST 4: Match...");
    await apiCall("/discover/swipe", "POST", { swipedOnId: mentorId, action: "like" }, studentToken);
    await apiCall("/discover/swipe", "POST", { swipedOnId: studentId, action: "like" }, mentorToken);
// TEST 5: BOOKING
    console.log("🧪 TEST 5: Booking...");
    const book = await apiCall("/sessions", "POST", {
        mentorId: mentorId, 
        skill: "React", 
        sessionType: "standard", 
        // 🔥 FIX: Current date + 1 day (Future date)
        scheduledDate: new Date(Date.now() + 86400000).toISOString() 
    }, studentToken);
    sessionId = book.data.id;
    console.log(`✅ Session ID: ${sessionId} booked.`);
    console.log("🧪 TEST 6: Session Lifecycle...");
    await apiCall(`/sessions/${sessionId}/accept`, "POST", {}, mentorToken);
    const sessionDetails = await apiCall("/sessions?role=mentor", "GET", null, mentorToken);
    const otp = sessionDetails.data[0].sessionOtp;
    await apiCall(`/sessions/${sessionId}/start`, "POST", { otp }, mentorToken);

    console.log("🧪 TEST 7: Dispute...");
    await apiCall(`/sessions/${sessionId}/dispute`, "POST", { reason: "Mentor was rude and did not show up." }, studentToken);
    await apiCall(`/admin/sessions/${sessionId}/resolve`, "POST", { action: "refund_student" }, adminToken);

    console.log("🧪 TEST 8: Quiz...");
    await apiCall("/quiz/submit", "POST", { isCorrect: true }, studentToken);

    console.log("🧪 TEST 9: Wallet...");
    await apiCall(`/admin/users/${studentId}/credits`, "POST", { amount: 100, reason: "Test" }, adminToken);
    const stats = await apiCall("/admin/stats", "GET", null, adminToken);
    console.log(`✅ Platform Revenue: ${stats.data.platformRevenue} cr`);

    console.log("\n=================================================");
    console.log("🎉 ALL TESTS PASSED! APP IS BULLETPROOF.");
    console.log("=================================================");
}

runMasterTest();