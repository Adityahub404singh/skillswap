import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  schema: [
    "./src/schema/users.ts",
    "./src/schema/sessions.ts", 
    "./src/schema/skills.ts",
    "./src/schema/transactions.ts",
    "./src/schema/ratings.ts"
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});