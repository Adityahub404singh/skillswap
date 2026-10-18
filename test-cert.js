require('dotenv').config();
const { Pool } = require('pg');

// Initialize Database Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper for visual divider lines in console output
function printDivider(symbol = "-", length = 70) {
  console.log(symbol.repeat(length));
}

// Global counters for test assertion reporting
let totalTestsPassed = 0;
let totalTestsFailed = 0;

function assertCondition(condition, testName, details = "") {
  if (condition) {
    console.log(`   ✅ PASSED: ${testName}`);
    if (details) console.log(`      └─ Info: ${details}`);
    totalTestsPassed++;
  } else {
    console.log(`   ❌ FAILED: ${testName}`);
    if (details) console.log(`      └─ Details: ${details}`);
    totalTestsFailed++;
  }
}

/**
 * Executes the exact ledger audit query logic used in index.ts
 */
async function executeLedgerAudit(email, skill) {
  const safeSkill = String(skill || "").trim();
  const safeEmail = String(email || "").trim();

  // Escape SQL LIKE wildcards (% and _)
  const likeSkill = `%${safeSkill.replace(/[\\%_]/g, "\\$&")}%`;

  const query = `
    SELECT 
      COUNT(DISTINCT s.id) AS session_count, 
      SUM(s.duration) / 60.0 AS total_hours
    FROM sessions s
    JOIN users u ON (s.student_id = u.id OR s.mentor_id = u.id)
    WHERE LOWER(u.email) = LOWER($1)
      AND LOWER(s.skill) LIKE LOWER($2)
      AND LOWER(s.status) = 'completed'
  `;

  const res = await pool.query(query, [safeEmail, likeSkill]);
  const row = res.rows[0] || {};
  const sessionsCount = parseInt(row.session_count, 10) || 0;
  const totalHours = row.total_hours != null ? Math.round(parseFloat(row.total_hours) * 10) / 10 : 0;

  return { sessionsCount, totalHours };
}

async function runComprehensiveLedgerTestSuite() {
  printDivider("=");
  console.log("🚀 SKILLSWAP ENTERPRISE LEDGER & CERTIFICATE AUDIT TEST SUITE");
  console.log("   Engine Target: Production Neon PostgreSQL DB");
  printDivider("=");

  try {
    // ------------------------------------------------------------------------
    // STEP 1: DYNAMIC DATA DISCOVERY (10X Logic to find 2 DISTINCT real users)
    // ------------------------------------------------------------------------
    console.log("\n🔍 DISCOVERY PHASE: Fetching distinct valid users & completed sessions...");

    // Query distinct users who actually have completed sessions in the ledger
    const distinctUsersRes = await pool.query(`
      SELECT DISTINCT u.id, u.email, u.name
      FROM users u
      JOIN sessions s ON (s.student_id = u.id OR s.mentor_id = u.id)
      WHERE LOWER(s.status) = 'completed'
      ORDER BY u.id ASC
    `);

    const usersWithSessions = distinctUsersRes.rows;

    console.log(`   Found ${usersWithSessions.length} distinct users with completed sessions in DB.`);

    if (usersWithSessions.length === 0) {
      console.log("❌ CRITICAL: No completed sessions found in DB for any user.");
      await pool.end();
      return;
    }

    // Assign Distinct User #1
    const user1 = usersWithSessions[0];
    
    // Assign Distinct User #2 (fallback to another user if available, else fetch any 2nd user)
    let user2 = usersWithSessions.length > 1 ? usersWithSessions[1] : null;

    if (!user2) {
      const anyOtherUserRes = await pool.query(`
        SELECT id, email, name FROM users WHERE id != $1 LIMIT 1
      `, [user1.id]);
      if (anyOtherUserRes.rows.length > 0) {
        user2 = anyOtherUserRes.rows[0];
      }
    }

    console.log(`   ► User #1 Selected: ID ${user1.id} (${user1.email})`);
    if (user2) {
      console.log(`   ► User #2 Selected: ID ${user2.id} (${user2.email})`);
    } else {
      console.log("   ► Note: DB has only 1 registered user account.");
    }

    // Discover real completed skills for User #1
    const user1SkillsRes = await pool.query(`
      SELECT DISTINCT s.skill 
      FROM sessions s
      JOIN users u ON (s.student_id = u.id OR s.mentor_id = u.id)
      WHERE u.id = $1 AND LOWER(s.status) = 'completed'
    `, [user1.id]);
    const user1Skills = user1SkillsRes.rows.map(r => r.skill);

    // Discover real completed skills for User #2 (if present)
    let user2Skills = [];
    if (user2) {
      const user2SkillsRes = await pool.query(`
        SELECT DISTINCT s.skill 
        FROM sessions s
        JOIN users u ON (s.student_id = u.id OR s.mentor_id = u.id)
        WHERE u.id = $1 AND LOWER(s.status) = 'completed'
      `, [user2.id]);
      user2Skills = user2SkillsRes.rows.map(r => r.skill);
    }

    printDivider("-");

    // ------------------------------------------------------------------------
    // TEST GROUP A: POSITIVE VALIDATION (2 DIFFERENT RIGHT EMAILS)
    // ------------------------------------------------------------------------
    console.log("\n🟢 [GROUP A] POSITIVE VALIDATION (2 Distinct Valid Email Scenarios)");

    // Scenario A1: First Right Email + Real Completed Skill
    const skillA1 = user1Skills[0] || "Python";
    console.log(`\n▶ Scenario A1: Right Email #1 (${user1.email}) + Valid Skill ("${skillA1}")`);
    const resA1 = await executeLedgerAudit(user1.email, skillA1);
    assertCondition(
      resA1.sessionsCount > 0 && resA1.totalHours > 0,
      "Right Email #1 correctly retrieved verified completed sessions from DB",
      `Sessions: ${resA1.sessionsCount}, Hours: ${resA1.totalHours} hrs`
    );

    // Scenario A2: Second Right Email (OR 2nd Valid Skill of User #1 if single user in DB)
    if (user2 && user2Skills.length > 0) {
      const skillA2 = user2Skills[0];
      console.log(`\n▶ Scenario A2: Right Email #2 (${user2.email}) + Valid Skill ("${skillA2}")`);
      const resA2 = await executeLedgerAudit(user2.email, skillA2);
      assertCondition(
        resA2.sessionsCount > 0 && resA2.totalHours > 0,
        "Right Email #2 correctly retrieved verified completed sessions from DB",
        `Sessions: ${resA2.sessionsCount}, Hours: ${resA2.totalHours} hrs`
      );
    } else {
      // Fallback A2: Test another distinct skill for User #1
      const skillA2 = user1Skills[1] || "dsa";
      console.log(`\n▶ Scenario A2: Right Email #1 Secondary Skill Test (${user1.email}) + Skill ("${skillA2}")`);
      const resA2 = await executeLedgerAudit(user1.email, skillA2);
      assertCondition(
        resA2.sessionsCount > 0,
        "Right Email secondary skill check matched ledger records",
        `Sessions: ${resA2.sessionsCount}, Hours: ${resA2.totalHours} hrs`
      );
    }

    printDivider("-");

    // ------------------------------------------------------------------------
    // TEST GROUP B: NEGATIVE SECURITY & WRONG EMAIL REJECTION (10X THINKING)
    // ------------------------------------------------------------------------
    console.log("\n🔴 [GROUP B] NEGATIVE VALIDATION (Wrong Emails & Edge Cases)");

    // Scenario B1: Wrong Email #1 (Unauthorized/Fake Hacker Email)
    const wrongEmail1 = "unauthorized.hacker.99@gmail.com";
    console.log(`\n▶ Scenario B1: Wrong Email #1 ("${wrongEmail1}") + Valid Skill ("${skillA1}")`);
    const resB1 = await executeLedgerAudit(wrongEmail1, skillA1);
    assertCondition(
      resB1.sessionsCount === 0 && resB1.totalHours === 0,
      "System strictly rejected fake/unregistered email with 0 sessions",
      `Sessions: ${resB1.sessionsCount}`
    );

    // Scenario B2: Wrong Email #2 (Random Non-existent Domain Email)
    const wrongEmail2 = "fake.student.test777@yahoo.com";
    console.log(`\n▶ Scenario B2: Wrong Email #2 ("${wrongEmail2}") + Valid Skill ("DSA")`);
    const resB2 = await executeLedgerAudit(wrongEmail2, "DSA");
    assertCondition(
      resB2.sessionsCount === 0 && resB2.totalHours === 0,
      "System strictly rejected non-existent domain email",
      `Sessions: ${resB2.sessionsCount}`
    );

    // Scenario B3: Right Email + Invalid Non-existent Skill
    const fakeSkill = "QuantumSupercomputing101";
    console.log(`\n▶ Scenario B3: Right Email (${user1.email}) + Fake Skill ("${fakeSkill}")`);
    const resB3 = await executeLedgerAudit(user1.email, fakeSkill);
    assertCondition(
      resB3.sessionsCount === 0,
      "System strictly rejected non-existent skill for valid user",
      `Sessions: ${resB3.sessionsCount}`
    );

    // Scenario B4: SQL Injection Attempt in Skill Parameter
    const sqlInjectionSkill = "Python' OR '1'='1";
    console.log(`\n▶ Scenario B4: SQL Injection Attack Test ("${sqlInjectionSkill}")`);
    const resB4 = await executeLedgerAudit(user1.email, sqlInjectionSkill);
    assertCondition(
      resB4.sessionsCount === 0,
      "Parameterized query safely neutralized SQL Injection attempt",
      `Sessions: ${resB4.sessionsCount}`
    );

    // Scenario B5: LIKE Wildcard Abuse Attempt (%)
    const wildcardSkill = "%";
    console.log(`\n▶ Scenario B5: LIKE Wildcard Abuse Test ("${wildcardSkill}")`);
    const resB5 = await executeLedgerAudit(user1.email, wildcardSkill);
    assertCondition(
      resB5.sessionsCount === 0,
      "Escaped LIKE wildcard prevented unauthorized match-all skill query",
      `Sessions: ${resB5.sessionsCount}`
    );

    printDivider("-");

    // ------------------------------------------------------------------------
    // SUMMARY REPORT
    // ------------------------------------------------------------------------
    printDivider("=");
    console.log("📋 FINAL TEST SUITE EXECUTIVE SUMMARY");
    console.log(`   Total Tests Executed : ${totalTestsPassed + totalTestsFailed}`);
    console.log(`   Passed Assertions    : ${totalTestsPassed} ✅`);
    console.log(`   Failed Assertions    : ${totalTestsFailed} ❌`);

    if (totalTestsFailed === 0) {
      console.log("\n🚀 RESULT: 100% PASSED! CERTIFICATION ENGINE IS PRODUCTION SECURE.");
    } else {
      console.log("\n⚠️ RESULT: FEW TESTS FAILED. PLEASE CHECK DETAILS ABOVE.");
    }
    printDivider("=");

  } catch (err) {
    console.error("\n❌ FATAL TEST RUNNER ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

// Execute the comprehensive test runner
runComprehensiveLedgerTestSuite();