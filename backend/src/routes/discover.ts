import { Router } from "express";
import { db } from "../db.js";
import { usersTable } from "../schema/users.js";
import { swipesTable } from "../schema/swipes.js"; 
import { eq, and, notInArray, inArray, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { notify } from "../notify.js"; // 🔥 Added notify import

const router = Router();

// 🎯 1. GET: Fetch Profiles for Swiping (Discover Page)
router.get("/profiles", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;

        const previousSwipes = await db
            .select({ swipedOnId: swipesTable.swipedOnId })
            .from(swipesTable)
            .where(eq(swipesTable.swiperId, userId));

        const swipedIds = previousSwipes.map((s) => s.swipedOnId);
        swipedIds.push(userId); // Exclude self

        const newProfiles = await db
            .select({
                id: usersTable.id,
                name: usersTable.name,
                avatar: usersTable.avatar,
                bio: usersTable.bio,
                skillsTeach: usersTable.skillsTeachV2,
                sessionsCompleted: usersTable.sessionsCompleted,
                averageRating: usersTable.averageRating,
                linkedinUrl: usersTable.linkedinUrl,
            })
            .from(usersTable)
            .where(notInArray(usersTable.id, swipedIds))
            .orderBy(desc(usersTable.id))
            .limit(10);

        const safeProfiles = newProfiles.map(user => {
            let parsedSkills: string[] = [];
            if (Array.isArray(user.skillsTeach)) {
                parsedSkills = user.skillsTeach;
            } else if (typeof user.skillsTeach === 'string') {
                try {
                    parsedSkills = JSON.parse(user.skillsTeach);
                    if (!Array.isArray(parsedSkills)) {
                        parsedSkills = [user.skillsTeach];
                    }
                } catch (e) {
                    parsedSkills = user.skillsTeach.split(',').map((s: string) => s.trim()).filter(Boolean);
                }
            }
            return {
                ...user,
                skillsTeach: parsedSkills
            };
        });

        res.json(safeProfiles);
    } catch (error) {
        console.error("Error fetching profiles:", error);
        res.status(500).json({ error: "Failed to fetch profiles" });
    }
});

// 💖 2. POST: Handle Swipe Action
router.post("/swipe", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const { swipedOnId, action } = req.body;

        if (!swipedOnId || typeof swipedOnId !== "number") {
            return res.status(400).json({ error: "Invalid swipedOnId" });
        }
        if (!["like", "pass"].includes(action)) {
            return res.status(400).json({ error: "Invalid action" });
        }

        if (swipedOnId === userId) {
            return res.status(400).json({ error: "Cannot swipe on yourself" });
        }

        const [targetUser] = await db
            .select({ id: usersTable.id, name: usersTable.name })
            .from(usersTable)
            .where(eq(usersTable.id, swipedOnId));

        if (!targetUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const existing = await db
            .select()
            .from(swipesTable)
            .where(
                and(
                    eq(swipesTable.swiperId, userId),
                    eq(swipesTable.swipedOnId, swipedOnId)
                )
            );

        if (existing.length > 0) {
            return res.status(400).json({ error: "Already swiped on this user" });
        }

        await db.insert(swipesTable).values({
            swiperId: userId,
            swipedOnId: swipedOnId,
            action: action,
        });

        if (action === "like") {
            const reverseSwipe = await db
                .select()
                .from(swipesTable)
                .where(
                    and(
                        eq(swipesTable.swiperId, swipedOnId),
                        eq(swipesTable.swipedOnId, userId),
                        eq(swipesTable.action, "like") 
                    )
                );

            if (reverseSwipe.length > 0) {
                // 🔥 FIX: Mutual Match Notification dono ko bhejo
                const [me] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
                if (me && targetUser) {
                    await notify.newMatch(swipedOnId, me.name);   // Target ko notify karo
                    await notify.newMatch(userId, targetUser.name); // Khud ko notify karo
                }

                return res.json({ success: true, isMatch: true, message: "It's a Match! 🎉" });
            }
        }

        res.json({ success: true, isMatch: false });
    } catch (error) {
        console.error("Error saving swipe:", error);
        res.status(500).json({ error: "Failed to process swipe" });
    }
});

// 💖 3. GET: Fetch Mutual Matches
router.get("/matches", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;

        const myLikes = await db
            .select()
            .from(swipesTable)
            .where(
                and(
                    eq(swipesTable.swiperId, userId),
                    eq(swipesTable.action, "like") 
                )
            );

        const myLikedIds = myLikes.map(s => s.swipedOnId);

        if (myLikedIds.length === 0) return res.json([]);

        const theyLikedMe = await db
            .select()
            .from(swipesTable)
            .where(
                and(
                    eq(swipesTable.swipedOnId, userId),
                    eq(swipesTable.action, "like") 
                )
            );

        const mutualMatchIds = theyLikedMe
            .filter(s => myLikedIds.includes(s.swiperId))
            .map(s => s.swiperId);

        if (mutualMatchIds.length === 0) return res.json([]);

        const matchedUsers = await db
            .select({
                id: usersTable.id,
                name: usersTable.name,
                avatar: usersTable.avatar,
                bio: usersTable.bio,
            })
            .from(usersTable)
            .where(inArray(usersTable.id, mutualMatchIds));

        const finalMatches = matchedUsers.filter(user => mutualMatchIds.includes(user.id));

        res.json(finalMatches);
    } catch (error) {
        console.error("Error fetching matches:", error);
        res.status(500).json({ error: "Failed to fetch matches" });
    }
});

export default router;