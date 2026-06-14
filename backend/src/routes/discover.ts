import { Router } from "express";
import { db } from "../db.js"; 
import { usersTable } from "../schema/users.js";
import { swipes } from "../schema/swipes.js"; 
import { eq, and, notInArray, sql } from "drizzle-orm";

const router = Router();

// 🎯 1. GET: Fetch Profiles for Swiping (Discover Page)
router.get("/profiles", async (req: any, res) => {
    try {
        const userId = req.user?.id || 1; 

        // 1. Get already swiped profiles
        const previousSwipes = await db
            .select({ swipedOnId: swipes.swipedOnId })
            .from(swipes)
            .where(eq(swipes.swiperId, userId));

        const swipedIds = previousSwipes.map((s) => s.swipedOnId);
        swipedIds.push(userId); // Exclude self

        // 2. Fetch fresh users
        const newProfiles = await db
            .select({
                id: usersTable.id,
                name: usersTable.name,
                avatar: usersTable.avatar,
                bio: usersTable.bio,
                skillsTeach: usersTable.skillsTeach,
                sessionsCompleted: usersTable.sessionsCompleted,
                averageRating: usersTable.averageRating,
                linkedinUrl: usersTable.linkedinUrl,
            })
            .from(usersTable)
            .where(notInArray(usersTable.id, swipedIds))
            .limit(10);

        // 🔥 CRASH-PROOF: Parse skills into an Array before sending to frontend
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
                    // If JSON fails, treat as comma-separated string
                    parsedSkills = user.skillsTeach.split(',').map((s: string) => s.trim()).filter(Boolean);
                }
            }
            return {
                ...user,
                skillsTeach: parsedSkills // Guaranteed to be an array now
            };
        });

        res.json(safeProfiles);
    } catch (error) {
        console.error("Error fetching profiles:", error);
        res.status(500).json({ error: "Failed to fetch profiles" });
    }
});

// 💖 2. POST: Handle Swipe Action
router.post("/swipe", async (req: any, res) => {
    try {
        const userId = req.user?.id || 1;
        const { swipedOnId, action } = req.body; 

        await db.insert(swipes).values({
            swiperId: userId,
            swipedOnId: swipedOnId,
            action: action,
        });

        if (action === "like") {
            const reverseSwipe = await db
                .select()
                .from(swipes)
                .where(
                    and(
                        eq(swipes.swiperId, swipedOnId),
                        eq(swipes.swipedOnId, userId),
                        eq(swipes.action, "like")
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
router.get("/matches", async (req: any, res) => {
    try {
        const userId = req.user?.id || 1;

        const myLikes = await db.select().from(swipes).where(and(eq(swipes.swiperId, userId), eq(swipes.action, 'like')));
        const myLikedIds = myLikes.map(s => s.swipedOnId);

        if (myLikedIds.length === 0) return res.json([]);

        const mutualSwipes = await db.select().from(swipes).where(and(
            eq(swipes.swipedOnId, userId),
            eq(swipes.action, 'like'),
            notInArray(swipes.swiperId, [0]) 
        ));
        
        const mutualMatchIds = mutualSwipes.filter(s => myLikedIds.includes(s.swiperId)).map(s => s.swiperId);

        if (mutualMatchIds.length === 0) return res.json([]);

        const myMatches = await db.select({
            id: usersTable.id,
            name: usersTable.name,
            avatar: usersTable.avatar,
            bio: usersTable.bio
        }).from(usersTable);
        
        const finalMatches = myMatches.filter(user => mutualMatchIds.includes(user.id));

        res.json(finalMatches);
    } catch (error) {
        console.error("Error fetching matches:", error);
        res.status(500).json({ error: "Failed to fetch matches" });
    }
});

export default router;