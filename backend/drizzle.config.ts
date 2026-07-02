import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  schema: [
    "./src/schema/users.ts",
    "./src/schema/sessions.ts",
    "./src/schema/skills.ts",
    "./src/schema/transactions.ts",
    "./src/schema/ratings.ts",
    "./src/schema/notifications.ts",
    "./src/schema/swipes.ts",
    "./src/schema/messages.ts",
    "./src/schema/platform.ts",
    "./src/schema/groupEnrollments.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

