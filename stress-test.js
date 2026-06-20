// stress-test.js
const API_BASE = "http://localhost:3001/api";

async function apiCall(endpoint, method = "GET", body = null, token = null, expectFail = true) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();
    
    // Yahan hum expect karte hain ki API ERROR de (4xx or 5xx)
    if (res.ok && !expectFail) {
        console.log(`✅ Success for ${endpoint}`);
    } else if (!res.ok && expectFail) {
        console.log(`✅ Security Passed: API correctly rejected bad input [${res.status}] ${endpoint}`);
    } else {
        console.error(`❌ Unexpected Behavior on ${endpoint}: Status ${res.status}`, data);
    }
}

async function runStressTest() {
    console.log("🔥 STARTING EVIL USER STRESS TEST...\n");

    // 1. Setup Bad Actor
    const reg = await fetch(`${API_BASE}/auth/register`, {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name: "Hacker", email: "hacker@evil.com", password: "password123" })
    });
    const { token } = await reg.json();

    // TEST: SQL Injection & XSS Attempt
    console.log("🧪 Test: Injecting Malicious Scripts...");
    await apiCall("/sessions", "POST", {
        mentorId: 1, 
        skill: "<script>alert('xss')</script> OR 1=1 --", 
        scheduledDate: new Date().toISOString()
    }, token, true);

    // TEST: Negative Wallet Amount (Hacker trying to steal)
    console.log("🧪 Test: Negative Withdrawal...");
    await apiCall("/wallet/withdraw", "POST", { amount: -5000, upiId: "hack@upi" }, token, true);

    // TEST: Past Date Booking
    console.log("🧪 Test: Booking in the Past...");
    await apiCall("/sessions", "POST", {
        mentorId: 1, skill: "React", scheduledDate: "1990-01-01T00:00:00Z"
    }, token, true);

    // TEST: Accessing Protected Route without Token
    console.log("🧪 Test: Accessing Wallet without Auth...");
    await apiCall("/wallet", "GET", null, null, true);

    // TEST: Massive Payload (Buffer Overflow simulation)
    console.log("🧪 Test: Massive Payload...");
    await apiCall("/sessions", "POST", { 
        mentorId: 1, 
        skill: "A".repeat(10000), 
        scheduledDate: new Date().toISOString() 
    }, token, true);

    console.log("\n✅ Stress Test Completed. If all are 'Security Passed', your app is robust!");
}

runStressTest();