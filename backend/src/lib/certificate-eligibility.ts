// eligibility.js
// Decides whether a user may get a certificate, and at which level.
//
// MODE 1 (default, CERT_STRICT unset): "open" — login is required, but no session check.
//   Use this to get QR verification working end-to-end first.
// MODE 2 (CERT_STRICT=true): checks real completed sessions with a READ-ONLY SELECT.
//   -> Adjust the table/column names inside fetchStats() to match your sessions table.
//   If the query fails, issuing returns an error — nothing in your platform is modified.

const LEVELS = {
    learner: [
        { level: 'Advanced',     sessions: 15, hours: 25, partners: 3 },
        { level: 'Intermediate', sessions: 8,  hours: 10, partners: 2 },
        { level: 'Foundation',   sessions: 3,  hours: 3,  partners: 2 }
    ],
    teacher: [
        { level: 'Master Mentor', sessions: 50, hours: 40, partners: 10 },
        { level: 'Senior Mentor', sessions: 20, hours: 15, partners: 6 },
        { level: 'Mentor',        sessions: 5,  hours: 3,  partners: 3 }
    ]
};

async function fetchStats({ db, sql, userId, skill, role }) {
    // ADJUST these names to your schema (read-only):
    //   table `sessions`, columns: learner_id, teacher_id, skill, status, duration_minutes
    const me = role === 'teacher' ? sql`teacher_id::text` : sql`learner_id::text`;
    const other = role === 'teacher' ? sql`learner_id::text` : sql`teacher_id::text`;
    const r = await db.execute(sql`
        SELECT COUNT(*)::int                                   AS sessions,
               COALESCE(SUM(duration_minutes), 0) / 60.0       AS hours,
               COUNT(DISTINCT ${other})::int                   AS partners
        FROM sessions
        WHERE ${me} = ${userId}
          AND LOWER(skill) = ${skill}
          AND status = 'completed'
          AND duration_minutes > 0
          AND learner_id::text <> teacher_id::text`);
    const row = (Array.isArray(r) ? r : (r && r.rows) || [])[0] || {};
    return { sessions: Number(row.sessions) || 0, hours: Number(row.hours) || 0, partners: Number(row.partners) || 0 };
}

export async function checkEligibility({ db, sql, userId, skill, role }) {
    if (process.env.CERT_STRICT !== 'true') {
        return { eligible: true, level: role === 'teacher' ? 'Mentor' : 'Foundation', sessions: null, hours: null, mode: 'open' };
    }

    const stats = await fetchStats({ db, sql, userId, skill, role });
    const tiers = LEVELS[role];
    const hit = tiers.find((t) => stats.sessions >= t.sessions && stats.hours >= t.hours && stats.partners >= t.partners);
    if (hit) {
        return { eligible: true, level: hit.level, sessions: stats.sessions, hours: Math.round(stats.hours * 10) / 10, mode: 'strict' };
    }
    const first = tiers[tiers.length - 1];
    return {
        eligible: false,
        progress: {
            sessions: stats.sessions, needSessions: first.sessions,
            hours: Math.round(stats.hours * 10) / 10, needHours: first.hours
        }
    };
}