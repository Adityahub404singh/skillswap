import "dotenv/config";
import { db } from "./db.js";
import { usersTable } from "./schema/users.js";
import { swipesTable } from "./schema/swipes.js";
import { eq, not } from "drizzle-orm";

async function seedDatabase() {
  console.log("🌱 Starting Database Seeding...");

  try {
    // 1. Asli users dhoondo (Taki unko fake likes bhej sakein)
    const realUsers = await db.select().from(usersTable).limit(5);
    
    if (realUsers.length === 0) {
        console.log("⚠️ Pehle apna ek asli account banao app me login karke!");
        process.exit(1);
    }

    console.log("✅ Creating Fake Profiles with HD Photos...");

    // 2. Insert Premium Fake Users with Real Images (bypassing TS strict checks for seed)
    const newProfiles = await db.insert(usersTable).values([
      {
        name: "Neha Sharma",
        email: `neha.fake.${Date.now()}@test.com`,
        password: "hashed_dummy_password", // agar email auth hai to required
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80",
        bio: "UI/UX Designer working at a top startup. I can teach you Figma and basic frontend. Looking to learn advanced React concepts!",
        skillsTeachV2: JSON.stringify(["Figma", "UI/UX", "Design Systems"]),
        sessionsCompleted: 14,
        averageRating: "4.9"
      },
      {
        name: "Rohan Gupta",
        email: `rohan.fake.${Date.now()}@test.com`,
        password: "hashed_dummy_password",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=500&q=80",
        bio: "Full Stack Dev. Expert in Node.js and Databases. Trying to improve my communication skills and public speaking.",
        skillsTeachV2: JSON.stringify(["Node.js", "PostgreSQL", "System Design"]),
        sessionsCompleted: 42,
        averageRating: "4.7"
      },
      {
        name: "Aisha Khan",
        email: `aisha.fake.${Date.now()}@test.com`,
        password: "hashed_dummy_password",
        avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80",
        bio: "Digital Marketing expert. I'll help you grow your startup's organic traffic. Need help with building a simple landing page.",
        skillsTeachV2: JSON.stringify(["SEO", "Marketing", "Copywriting"]),
        sessionsCompleted: 8,
        averageRating: "5.0"
      }
    ] as any[]).returning();

    console.log(`✅ ${newProfiles.length} Fake Profiles Created!`);
    console.log("🔥 Generating automatic 'Likes' for your real account...");

    // 3. Fake users se TERE asli accounts par LIKE karwa rahe hain
    for (const fakeUser of newProfiles) {
        for (const realUser of realUsers) {
            // Fake user likes real user
            await db.insert(swipesTable).values({
                swiperId: fakeUser.id,
                swipedOnId: realUser.id,
                action: "like"
            }).onConflictDoNothing(); // Ignore if already liked
        }
    }

    console.log("🎉 SUCCESS: Seeding complete! Ab app me jaake Right Swipe karo aur Match dekho!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Seeding Failed:", error);
    process.exit(1);
  }
}

seedDatabase();