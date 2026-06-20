import { Router } from "express";
import { db } from "../db.js";
import { usersTable } from "../schema/users.js";
import { swipesTable } from "../schema/swipes.js"; 
import { eq, and, notInArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js"; // 🔥 Security Added

const router = Router();

// 🎯 1. GET: Fetch Profiles for Swiping (Discover Page)
router.get("/profiles", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!; // 🔥 FIX

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
        const userId = req.userId!; // 🔥 FIX
        const { swipedOnId, action } = req.body;

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
        const userId = req.userId!; // 🔥 FIX

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
            .where(notInArray(usersTable.id, mutualMatchIds.map(id => id))); 

        const finalMatches = matchedUsers.filter(user => mutualMatchIds.includes(user.id));

        res.json(finalMatches);
    } catch (error) {
        console.error("Error fetching matches:", error);
        res.status(500).json({ error: "Failed to fetch matches" });
    }
});

export default router;