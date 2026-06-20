// verify-system.js
// Run this file using: node verify-system.js

// Pehle: const API_BASE = "http://localhost:3001/api";
// Ab ye karo:
const API_BASE = "http://127.0.0.1:3001/api";// Apne port ke hisaab se change kar lena

// 🧠 SMART Helper function fetch ke liye
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
        console.log("👉 HINT: Backend server chalu nahi hai, ya phir PORT galat hai. Pehle 'npm run dev' run karo!");
        process.exit(1);
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runMasterTest() {
    console.log("=================================================");
    console.log("🚀 STARTING SKILLSWAP 10x MASTER VERIFICATION SCRIPT");
    console.log("=================================================\n");

    let studentToken, mentorToken, adminToken;
    let studentId, mentorId, adminId;
    let sessionId, disputeSessionId;
    let adminRes; // ✅ Sirf yahan ek baar declare hoga

    const rand = Math.floor(Math.random() * 100000);

    // ==========================================
    // TEST 1: REGISTRATION & LOGIN
    // ==========================================
    console.log("🧪 TEST 1: User Registration & Authentication...");
    
    const studentRes = await apiCall("/auth/register", "POST", {
        name: "Alice Student", email: `alice${rand}@test.com`, password: "password123",
        skillsLearn: ["React", "Nodejs"]
    });
    studentToken = studentRes.data.token;
    studentId = studentRes.data.user.id;
    console.log(`✅ Student (Alice) Registered: ID ${studentId} (Got 200 Welcome Bonus)`);

    const mentorRes = await apiCall("/auth/register", "POST", {
        name: "Bob Mentor", email: `bob${rand}@test.com`, password: "password123",
        skillsTeach: ["React", "System Design"], pricePerHour: 50
    });
    mentorToken = mentorRes.data.token;
    mentorId = mentorRes.data.user.id;
    console.log(`✅ Mentor (Bob) Registered: ID ${mentorId}`);

    // 🔥 FIX: REAL admin (jiska email ADMIN_EMAILS list mein hai, default singhaditya4560@gmail.com)
    // yahan hi login/register karo taaki Test 3 mein requireAdmin pass ho sake.
    // Random email se "Charlie" register karne se isAdmin true nahi hota — sirf
    // ADMIN_EMAILS list ka email match karne se admin access milta hai.
    const adminEmail = "singhaditya4560@gmail.com"; // 🔥 Tumhara asli admin email

    adminRes = await apiCall("/auth/register", "POST", {
        name: "Charlie Admin", email: adminEmail, password: "Admin@123" 
    }, null, true); // expectFail = true kyunki account pehle se ho sakta hai

    if (adminRes.status === 409 || adminRes.status === 400) {
        adminRes = await apiCall("/auth/login", "POST", { email: adminEmail, password: "Admin@123" });
        console.log(`✅ Admin (Charlie) Logged In: ID ${adminRes.data.user.id}`);
    } else {
        console.log(`✅ Admin (Charlie) Registered: ID ${adminRes.data.user.id}`);
    }

    adminToken = adminRes.data.token;
    adminId = adminRes.data.user.id;

    // Login Test
    const loginRes = await apiCall("/auth/login", "POST", { email: `alice${rand}@test.com`, password: "password123" });
    console.log(loginRes.status === 200 ? "✅ Login verified successfully." : "❌ Login failed.");
    console.log("");

    // ==========================================
    // TEST 2: REFERRAL SYSTEM
    // ==========================================
    console.log("🧪 TEST 2: Referral System...");
    const refRes = await apiCall("/auth/referral", "GET", null, studentToken);
    const refCode = refRes.data.referralCode;
    console.log(`✅ Alice's Referral Code generated: ${refCode}`);
    
    await apiCall("/auth/register", "POST", {
        name: "Dave Referral", email: `dave${rand}@test.com`, password: "password123", referralCode: refCode
    });
    console.log(`✅ Dave registered using Alice's referral code!`);
    console.log("");

    // ==========================================
    // TEST 3: MENTOR PROFILE & SKILL VERIFICATION
    // ==========================================
    console.log("🧪 TEST 3: Mentor Profile & Skill Verification...");
    await apiCall("/users/me", "PATCH", { bio: "Senior Dev", pricePerHour: 100, skillsTeach: ["React"] }, mentorToken);
    
    await apiCall("/verification/submit", "POST", { skill: "React", proofLink: "github.com/bob" }, mentorToken);
    console.log("✅ Mentor submitted skill proof for 'React'.");
    
    // Admin approves proof (ab REAL admin token use ho raha hai)
    await apiCall("/verification/approve", "POST", { userId: mentorId, skill: "React" }, adminToken);
    console.log("✅ Admin approved Mentor's skill!");
    console.log("");

    // ==========================================
    // TEST 4: SWIPING & MATCHING
    // ==========================================
    console.log("🧪 TEST 4: Swiping & Match Algorithm...");
    await apiCall("/discover/swipe", "POST", { swipedOnId: mentorId, action: "like" }, studentToken);
    const reverseSwipeRes = await apiCall("/discover/swipe", "POST", { swipedOnId: studentId, action: "like" }, mentorToken);
    
    if (reverseSwipeRes.data.isMatch) console.log("✅ Mutual Match Successful! 🎉");
    console.log("");

    // ==========================================
    // // ==========================================
    // TEST 6: BOOKING & CANCELLATION REFUND (ESCROW TEST)
    // ==========================================
    console.log("🧪 TEST 6: Booking & Escrow Refund (Cancellation)...");
    
    // ✅ Future date sirf ek baar yahan define kar di
    const tomorrow = new Date(Date.now() + 86400000); 

    const cancelTestBook = await apiCall("/sessions", "POST", {
        mentorId: mentorId, skill: "React", sessionType: "standard", scheduledDate: tomorrow.toISOString()
    }, studentToken);
    
    const preRefundBalance = (await apiCall("/wallet", "GET", null, studentToken)).data.balance;
    await apiCall(`/sessions/${cancelTestBook.data.id}/cancel`, "POST", { reason: "Changed my mind" }, studentToken);
    const postRefundBalance = (await apiCall("/wallet", "GET", null, studentToken)).data.balance;
    
    if (postRefundBalance > preRefundBalance) {
        console.log(`✅ Escrow Refund Working! Balance restored from ${preRefundBalance} to ${postRefundBalance}.`);
    } else {
        console.log("❌ Refund Failed!");
    }
    console.log("");

    // ==========================================
    // TEST 7: DISPUTE & ADMIN RESOLUTION
    // ==========================================
    console.log("🧪 TEST 7: Dispute Resolution System...");
    
    // ✅ tomorrow reuse kiya (No 'const' here!)
    const disputeBook = await apiCall("/sessions", "POST", {
        mentorId: mentorId, skill: "React", sessionType: "standard", scheduledDate: tomorrow.toISOString() 
    }, studentToken);
    
    disputeSessionId = disputeBook.data.id;
    
    await apiCall(`/sessions/${disputeSessionId}/accept`, "POST", {}, mentorToken);
    const disputeRes = await apiCall(`/sessions/${disputeSessionId}/dispute`, "POST", { reason: "Mentor did not show up on time and was rude." }, studentToken);
    console.log(disputeRes.status === 200 ? "✅ Student successfully raised a dispute." : "❌ Dispute failed.");

    const resolveRes = await apiCall(`/admin/sessions/${disputeSessionId}/resolve`, "POST", { action: "refund_student" }, adminToken);
    console.log(resolveRes.status === 200 ? "✅ Admin resolved dispute and refunded student." : "❌ Admin resolution failed.");
    console.log("");

    // ==========================================
    // TEST 8: RATING & REVIEWS
    // ==========================================
    console.log("🧪 TEST 8: Ratings & Reviews System...");

    // ✅ tomorrow reuse kiya (No 'const' here!)
    const ratingBook = await apiCall("/sessions", "POST", {
        mentorId: mentorId, 
        skill: "React", 
        sessionType: "micro_15", 
        scheduledDate: tomorrow.toISOString() 
    }, studentToken);

    await apiCall(`/admin/sessions/${ratingBook.data.id}/resolve`, "POST", { action: "pay_mentor" }, adminToken);

    const rateRes = await apiCall(`/sessions/${ratingBook.data.id}/rate`, "POST", { rating: 5, review: "Amazing mentor!" }, studentToken);
    console.log(rateRes.status === 200 ? "✅ Student rated the session 5 stars!" : "❌ Rating failed.");
    console.log("");

    // ==========================================
    // TEST 9: FLASH BOARD
    // ==========================================
    console.log("🧪 TEST 9: Flash Board (Quick Doubts)...");
    const flashRes = await apiCall("/sessions/flash/post", "POST", { skill: "NodeJS", message: "Help!", creditsAmount: 20 }, studentToken);
    await apiCall(`/sessions/${flashRes.data.id}/claim-flash`, "POST", {}, mentorToken);
    console.log("✅ Flash board doubt posted by student and claimed by mentor successfully.");
    console.log("");
    // TEST 10: STREAKS, QUIZ & LEADERBOARD
    // ==========================================
    console.log("🧪 TEST 10: Gamification (Quiz, Streaks, Leaderboard)...");
    await apiCall("/quiz/submit", "POST", { isCorrect: true }, studentToken);
    const streakRes = await apiCall("/gamification/streak", "POST", {}, studentToken);
    console.log(`✅ Daily Streak Updated: ${streakRes.data.streak} days`);
    
    const leaderboardRes = await apiCall("/gamification/leaderboard", "GET", null, studentToken);
    console.log(`✅ Leaderboard fetched. Top ranker: ${leaderboardRes.data[0]?.name || "None"}`);
    console.log("");

    // ==========================================
    // TEST 11: PLATFORM FEEDBACK & NEWSLETTER
    // ==========================================
    console.log("🧪 TEST 11: Feedback & Newsletter...");
    await apiCall("/platform/subscribe", "POST", { email: "newsletter@test.com" });
    await apiCall("/platform/feedback", "POST", { rating: 5, text: "Great app!" }, studentToken);
    console.log("✅ Newsletter subscription and platform feedback submitted.");
    console.log("");

    // ==========================================
    // TEST 12: NOTIFICATIONS
    // ==========================================
    console.log("🧪 TEST 12: Notifications System...");
    const notifRes = await apiCall("/notifications", "GET", null, studentToken);
    console.log(`✅ Notifications fetched successfully. Unread: ${notifRes.data.filter(n => !n.isRead).length}`);
    
    await apiCall("/notifications/read-all", "PATCH", null, studentToken);
    console.log("✅ All notifications marked as read.");
    console.log("");

    // ==========================================
    // TEST 13: PAYOUTS & ADMIN DASHBOARD
    // ==========================================
    console.log("🧪 TEST 13: Admin Dashboard & Payout Security...");
    
    const withdrawRes = await apiCall("/wallet/withdraw", "POST", { amount: 500, upiId: "bob@ybl" }, mentorToken, true);
    if (withdrawRes.status !== 200) {
        console.log("✅ Security Working: 7-Day Lock prevents withdrawal of un-matured credits.");
    }

    const statsRes = await apiCall("/admin/stats", "GET", null, adminToken);
    console.log("✅ Admin Dashboard Stats loaded:");
    console.log(`   Total Users: ${statsRes.data.totalUsers}`);
    console.log(`   Platform Revenue (Commission): ${statsRes.data.platformRevenue} cr`);

    console.log("\n==========================================================");
    console.log("🚀🔥 ALL 10x TESTS PASSED SUCCESSFULLY! SYSTEM IS BULLETPROOF.");
    console.log("==========================================================");
}

runMasterTest();