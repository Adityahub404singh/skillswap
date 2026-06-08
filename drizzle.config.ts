import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import path from "path";

// Check both root and backend folders for .env
dotenv.config(); 
dotenv.config({ path: path.resolve(process.cwd(), "backend", ".env") });

export default defineConfig({
  schema: "./backend/src/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});