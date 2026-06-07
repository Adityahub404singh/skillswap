ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "skills_teach" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "skills_teach" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "skills_learn" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "skills_learn" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "credits" SET DEFAULT 50;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "credits" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "trust_score" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "sessions_completed" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "average_rating" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "average_rating" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "price_per_hour" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "price_per_hour" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "current_streak" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "longest_streak" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "verified_skills" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "verified_skills" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "badges" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "badges" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "micro_sessions_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "portfolio_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "seo_slug" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_premium" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "premium_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_last_sent" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referred_by" integer;