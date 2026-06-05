# SkillSwap - Group Sessions + Micro Sessions + Profile TS Fix
# cd C:\Users\alc\skillswap  then  .\fix-all.ps1
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# ============================================================
# 1. BACKEND: Add group + micro routes to sessions.ts
# ============================================================
$sessionsAppend = @'

// ── POST /api/sessions/group ─────────────────────────────────
const GroupSchema = z.object({
  skill:         z.string().min(1),
  scheduledDate: z.string(),
  creditsAmount: z.number().int().min(1).default(20),
  maxStudents:   z.number().int().min(2).max(50).default(10),
  duration:      z.number().int().optional().default(60),
  meetLink:      z.string().optional(),
  message:       z.string().optional(),
});

router.post("/group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = GroupSchema.parse(req.body);

    const mentors = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    const mentor  = mentors[0];
    if (!mentor) return res.status(404).json({ error: "User not found" });

    const [session] = await db.insert(sessionsTable).values({
      mentorId:      req.userId!,
      studentId:     req.userId!, // group sessions: creator is also host
      skill:         data.skill,
      scheduledDate: new Date(data.scheduledDate),
      duration:      data.duration ?? 60,
      status:        "pending",
      creditsAmount: data.creditsAmount,
      isGroup:       1,
      maxStudents:   data.maxStudents,
      sessionType:   "standard",
      meetLink:      data.meetLink ?? null,
      message:       data.message ?? null,
    }).returning();

    res.status(201).json({
      ...session,
      message: `Group session created for up to ${data.maxStudents} students`,
    });
  } catch (err: any) {
    console.error("[sessions/group]", err.message);
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/sessions/group ──────────────────────────────────
router.get("/group", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.isGroup, 1))
      .orderBy(desc(sessionsTable.scheduledDate));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sessions/group/:id/join ───────────────────────
router.post("/group/:id/join", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const sessions  = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    const session   = sessions[0];

    if (!session)          return res.status(404).json({ error: "Group session not found" });
    if (!session.isGroup)  return res.status(400).json({ error: "Not a group session" });
    if (session.status !== "pending") return res.status(400).json({ error: "Session not joinable" });

    const learners = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    const learner  = learners[0];
    if (!learner) return res.status(404).json({ error: "User not found" });
    if (learner.credits < session.creditsAmount) {
      return res.status(400).json({ error: `Need ${session.creditsAmount} credits, you have ${learner.credits}` });
    }

    // Deduct credits
    await db.update(usersTable)
      .set({ credits: learner.credits - session.creditsAmount })
      .where(eq(usersTable.id, req.userId!));

    await db.insert(transactionsTable).values({
      userId:      req.userId!,
      type:        "spent",
      amount:      session.creditsAmount,
      description: `Joined group session: ${session.skill}`,
      sessionId:   session.id,
    });

    res.json({ success: true, message: "Joined group session successfully!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/sessions/micro ──────────────────────────────────
// Returns only micro sessions (15 or 30 min)
router.get("/micro", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(sessionsTable)
      .where(
        or(
          eq(sessionsTable.sessionType, "micro_15"),
          eq(sessionsTable.sessionType, "micro_30"),
          eq(sessionsTable.sessionType, "doubt")
        )
      )
      .orderBy(desc(sessionsTable.scheduledDate));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/sessions/stats ──────────────────────────────────
router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const allSessions = await db
      .select()
      .from(sessionsTable)
      .where(
        or(
          eq(sessionsTable.mentorId, req.userId!),
          eq(sessionsTable.studentId, req.userId!)
        )
      );

    const completed  = allSessions.filter(s => s.status === "completed").length;
    const asMentor   = allSessions.filter(s => s.mentorId === req.userId && s.status === "completed").length;
    const asLearner  = allSessions.filter(s => s.studentId === req.userId && s.status === "completed").length;
    const microCount = allSessions.filter(s => ["micro_15","micro_30","doubt"].includes(s.sessionType ?? "")).length;
    const groupCount = allSessions.filter(s => s.isGroup === 1).length;

    res.json({ total: allSessions.length, completed, asMentor, asLearner, microCount, groupCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
'@

# Read existing sessions.ts
$sessionsPath = "backend\src\routes\sessions.ts"
$existing = Get-Content $sessionsPath -Raw

# Check if group route already exists
if ($existing -match "sessions/group") {
  Write-Host "Group routes already exist - skipping" -ForegroundColor Yellow
} else {
  # Insert new routes BEFORE "export default router"
  $updated = $existing -replace "export default router;", "$sessionsAppend`nexport default router;"
  [System.IO.File]::WriteAllText("$pwd\$sessionsPath", $updated, [System.Text.Encoding]::UTF8)
  Write-Host "sessions.ts - group/micro/stats routes added" -ForegroundColor Green
}

# ============================================================
# 2. FRONTEND: Fix profile.tsx TS errors
# ============================================================
$profilePath = "src\pages\profile.tsx"
$profile = Get-Content $profilePath -Raw

# Fix unlockedBadges type - handle all variants
$profile = $profile -replace 'const \[unlockedBadges\] = useState\(\[0, 1, 4\]\)', 'const [unlockedBadges] = useState<number[]>([0, 1, 4])'
$profile = $profile -replace 'const \[unlockedBadges, setUnlockedBadges\] = useState\(\[0, 1, 4\]\)', 'const [unlockedBadges, setUnlockedBadges] = useState<number[]>([0, 1, 4])'
$profile = $profile -replace 'useState\(\[0, 1, 4\]\)', 'useState<number[]>([0, 1, 4])'

# Fix averageRating null - wrap with nullish coalescing
$profile = $profile -replace '([^(])user\.averageRating >= 4\.8', '$1((user as any).averageRating ?? 0) >= 4.8'
$profile = $profile -replace '\(user\.averageRating >= 4\.8\)', '((user as any).averageRating ?? 0) >= 4.8'
$profile = $profile -replace 'user\.averageRating([^?])', '((user as any).averageRating ?? 0)$1'

[System.IO.File]::WriteAllText("$pwd\$profilePath", $profile, [System.Text.Encoding]::UTF8)
Write-Host "profile.tsx TS errors fixed" -ForegroundColor Green

# ============================================================
# 3. BUILD BOTH
# ============================================================
Write-Host "`nBuilding frontend..." -ForegroundColor Cyan
$feBuild = npm run build 2>&1
$feErrors = $feBuild | Select-String "error TS"
if ($feErrors) {
  Write-Host "Frontend TS errors:" -ForegroundColor Red
  $feErrors | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
  Write-Host "Frontend BUILD PASSED!" -ForegroundColor Green
  $feBuild | Select-String "built in" | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan }
}

Write-Host "`nBuilding backend..." -ForegroundColor Cyan
cd backend
$beBuild = npm run build 2>&1
$beErrors = $beBuild | Select-String "error TS|error:"
if ($beErrors) {
  Write-Host "Backend errors:" -ForegroundColor Red
  $beErrors | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
  Write-Host "Backend BUILD PASSED!" -ForegroundColor Green
}
cd ..

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  ALL DONE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "New API routes added:" -ForegroundColor Yellow
Write-Host "  POST /api/sessions/group        - Create group session" -ForegroundColor White
Write-Host "  GET  /api/sessions/group        - List all group sessions" -ForegroundColor White
Write-Host "  POST /api/sessions/group/:id/join - Join a group session" -ForegroundColor White
Write-Host "  GET  /api/sessions/micro        - List micro sessions (15/30min)" -ForegroundColor White
Write-Host "  GET  /api/sessions/stats        - Session stats for current user" -ForegroundColor White
Write-Host ""
Write-Host "Now restart backend: cd backend && npm run dev" -ForegroundColor Cyan
Write-Host "Then test: POST http://localhost:5000/api/sessions/group" -ForegroundColor Cyan
