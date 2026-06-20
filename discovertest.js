// test-match.js
// Run using: node test-match.js

const API_BASE = "http://127.0.0.1:3001/api"; // Ensure tera backend isi port par chal raha hai

async function apiCall(endpoint, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json();
  return { status: res.status, data };
}

async function createMatch() {
  console.log("=========================================");
  console.log("🚀 STARTING QUICK MATCH SCRIPT");
  console.log("=========================================\n");

  const rand = Math.floor(Math.random() * 90000) + 10000;
  
  // 1. Create User A (Student)
  const emailA = `rahul_${rand}@test.com`;
  const passA = "password123";
  const resA = await apiCall("/auth/register", "POST", { 
      name: "Rahul Student", email: emailA, password: passA, skillsLearn: ["React"] 
  });
  const tokenA = resA.data.token;
  const idA = resA.data.user.id;
  console.log(`✅ User 1 (Rahul) Created! ID: ${idA}`);

  // 2. Create User B (Mentor)
  const emailB = `priya_${rand}@test.com`;
  const passB = "password123";
  const resB = await apiCall("/auth/register", "POST", { 
      name: "Priya Mentor", email: emailB, password: passB, skillsTeach: ["React"] 
  });
  const tokenB = resB.data.token;
  const idB = resB.data.user.id;
  console.log(`✅ User 2 (Priya) Created! ID: ${idB}`);

  console.log("\n🔄 Processing Swipes...");

  // 3. User A likes User B
  await apiCall("/discover/swipe", "POST", { swipedOnId: idB, action: "like" }, tokenA);
  console.log(`👍 Rahul swiped RIGHT on Priya`);

  // 4. User B likes User A (Mutual Match)
  const matchRes = await apiCall("/discover/swipe", "POST", { swipedOnId: idA, action: "like" }, tokenB);
  
  if (matchRes.data.isMatch) {
      console.log(`🎉 Priya swiped RIGHT on Rahul -> IT'S A MATCH!`);
  } else {
      console.log(`❌ Match nahi hua! Check backend code.`);
  }

  // 5. Print Login Credentials
  console.log("\n=========================================");
  console.log("🎯 TEST COMPLETE! NOW LOG IN TO FRONTEND:");
  console.log("=========================================");
  console.log(`🧑 Account 1: ${emailA}`);
  console.log(`👩 Account 2: ${emailB}`);
  console.log(`🔑 Password  : password123`);
  console.log("=========================================\n");
  console.log("👉 Apne frontend app me jao, inn dono me se kisi ek se login karo aur 'Matches' page check karo!");
}

createMatch();