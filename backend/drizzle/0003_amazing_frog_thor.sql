CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(30) NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"is_notif_read" boolean DEFAULT false,
	"action_url" varchar(300),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"swiper_id" integer NOT NULL,
	"swiped_on_id" integer NOT NULL,
	"direction" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer NOT NULL,
	"receiver_id" integer NOT NULL,
	"content" text NOT NULL,
	"is_msg_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"rating" integer NOT NULL,
	"text" text NOT NULL,
	"is_fb_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'footer',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "credits" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "trust_score" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "sessions_completed" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "average_rating" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "price_per_hour" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "current_streak" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "longest_streak" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "micro_sessions_count" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_email_verified_status" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verify_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verify_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_phone_verified_status" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "skills_teach_v2" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "skills_learn_v2" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verified_skills_v2" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "badges_v2" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_portfolio_public" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_premium_user" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "earned_balance" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "is_negotiated_price" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "session_type" varchar(20) DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "teacher_rating" real;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "learner_rating" real;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "teacher_review" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "learner_review" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "is_mentor_confirmed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "is_student_confirmed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "is_flagged" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "flag_reason" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "escrow_amount" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "payment_status" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "dispute_reason" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "scheduled_at" timestamp;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "active_minutes" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "last_heartbeat_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "skills_teach";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "skills_learn";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "verified_skills";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "badges";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "portfolio_public";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_premium";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "negotiated_price";