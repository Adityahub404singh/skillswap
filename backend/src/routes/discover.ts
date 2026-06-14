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
// 💖 3. GET: Fetch Mutual Matches (Crash-Proof Drizzle Version)
router.get("/matches", async (req: any, res) => {
    try {
        // Fallback to 1 for testing if token is missing
        const userId = req.user?.id || 1;

        // 1. Jinhe is user ne 'like' kiya hai unki list nikalo
        const myLikes = await db.select().from(swipes).where(and(eq(swipes.swiperId, userId), eq(swipes.action, 'like')));
        const myLikedIds = myLikes.map(s => s.swipedOnId);

        if (myLikedIds.length === 0) {
            return res.json([]); // Agar kisi ko like nahi kiya, toh 0 matches
        }

        // 2. Jinhone is user ko 'like' kiya hai AND jo myLikedIds mein hain (Mutual)
        const mutualSwipes = await db.select().from(swipes).where(and(
            eq(swipes.swipedOnId, userId),
            eq(swipes.action, 'like'),
            notInArray(swipes.swiperId, [0]) // Dummy condition to prevent empty array error, we will filter below
        ));
        
        // Manual filter for safety
        const mutualMatchIds = mutualSwipes.filter(s => myLikedIds.includes(s.swiperId)).map(s => s.swiperId);

        if (mutualMatchIds.length === 0) {
            return res.json([]); // Mutual match nahi mila
        }

        // 3. Un mutual matches ki profile details nikal lo
        const myMatches = await db.select({
            id: usersTable.id,
            name: usersTable.name,
            avatar: usersTable.avatar,
            bio: usersTable.bio
        }).from(usersTable);
        
        // Filter those who are in mutual matches
        const finalMatches = myMatches.filter(user => mutualMatchIds.includes(user.id));

        res.json(finalMatches);
    } catch (error) {
        console.error("Error fetching matches:", error);
        res.status(500).json({ error: "Failed to fetch matches" });
    }
});

export default router;