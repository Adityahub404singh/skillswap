import { Router } from "express";
import { db } from "../db.js"; 
import { usersTable } from "../schema/users.js"; // 🔥 Sahi naam import kiya
import { swipes } from "../schema/swipes.js"; 
import { eq, and, notInArray, sql } from "drizzle-orm";


const router = Router();

// 🎯 1. GET: Fetch Profiles for Swiping (Discover Page)
router.get("/profiles", async (req: any, res) => {
    try {
        // NOTE: Agar postman mein bina login test karna ho toh fallback ID 1 lagayi hai
        const userId = req.user?.id || 1; 

        // 1. Un logo ki list nikalo jinhe ye user pehle hi swipe kar chuka hai
        const previousSwipes = await db
            .select({ swipedOnId: swipes.swipedOnId })
            .from(swipes)
            .where(eq(swipes.swiperId, userId));

        const swipedIds = previousSwipes.map((s) => s.swipedOnId);
        swipedIds.push(userId); // Apni khud ki profile dobara nahi dikhani chahiye

        // 2. Fresh users fetch karo (jo swipedIds mein nahi hain)
        const newProfiles = await db
            .select({
                id: usersTable.id,
                name: usersTable.name,
                avatar: usersTable.avatar,
                bio: usersTable.bio,
                skillsTeach: usersTable.skillsTeach,
                sessionsCompleted: usersTable.sessionsCompleted,
                averageRating: usersTable.averageRating,
            })
            .from(usersTable)
            .where(notInArray(usersTable.id, swipedIds))
            .limit(10); // Ek baar mein 10 profiles bhejenge

        res.json(newProfiles);
    } catch (error) {
        console.error("Error fetching profiles:", error);
        res.status(500).json({ error: "Failed to fetch profiles" });
    }
});

// 💖 2. POST: Handle Swipe Action (Like or Pass)
router.post("/swipe", async (req: any, res) => {
    try {
        const userId = req.user?.id || 1;
        const { swipedOnId, action } = req.body; // action 'like' ya 'pass' aayega frontend se

        // 1. Swipe action ko database mein record karo
        await db.insert(swipes).values({
            swiperId: userId,
            swipedOnId: swipedOnId,
            action: action,
        });

        // 2. Agar user ne 'like' kiya hai, toh Mutual Match check karo
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
                // ITS A MATCH! 🎉 (Dono ne ek dusre ko like kiya hai)
                return res.json({ 
                    success: true, 
                    isMatch: true, 
                    message: "It's a Match! 🎉" 
                });
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
        const userId = req.user?.id || 1; // Tumhara auth middleware jaisa hai

        // Fetch those users where there is a mutual 'like'
        const myMatchesResult = await db.execute(sql`
            SELECT u.id, u.name, u.avatar, u.bio
            FROM users u
            JOIN swipes s1 ON u.id = s1.swiped_on_id
            JOIN swipes s2 ON u.id = s2.swiper_id
            WHERE s1.swiper_id = ${userId} AND s1.action = 'like'
            AND s2.swiped_on_id = ${userId} AND s2.action = 'like'
        `);

        // Neon DB se mostly .rows mein data aata hai
        const myMatches = myMatchesResult.rows || myMatchesResult;

        res.json(myMatches);
    } catch (error) {
        console.error("Error fetching matches:", error);
        res.status(500).json({ error: "Failed to fetch matches" });
    }
});
export default router;