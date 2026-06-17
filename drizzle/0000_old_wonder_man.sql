CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"password_hash" text,
	"is_email_verified_status" boolean DEFAULT false,
	"email_verify_token" text,
	"phone_verify_token" text,
	"is_phone_verified_status" boolean DEFAULT false,
	"bio" text,
	"avatar" text,
	"linkedin_url" text,
	"skills_teach_v2" jsonb,
	"skills_learn_v2" jsonb,
	"credits" integer DEFAULT 50,
	"trust_score" integer DEFAULT 0,
	"sessions_completed" integer DEFAULT 0,
	"average_rating" real DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"price_per_hour" integer DEFAULT 0,
	"is_admin" integer DEFAULT 0,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_active_date" text,
	"verified_skills_v2" jsonb,
	"badges_v2" jsonb,
	"location" varchar(100),
	"micro_sessions_count" integer DEFAULT 0,
	"is_portfolio_public" boolean DEFAULT true,
	"seo_slug" varchar(100),
	"is_premium_user" boolean DEFAULT false,
	"premium_expires_at" timestamp,
	"notification_last_sent" timestamp,
	"referred_by" integer,
	"earned_balance" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"skill" text NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"message" text,
	"meet_link" text,
	"credits_amount" integer DEFAULT 10 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"actual_duration" integer,
	"is_group" integer DEFAULT 0,
	"max_students" integer DEFAULT 1,
	"is_negotiated_price" boolean DEFAULT false,
	"session_type" varchar(20) DEFAULT 'standard' NOT NULL,
	"cancel_reason" text,
	"teacher_rating" real,
	"learner_rating" real,
	"teacher_review" text,
	"learner_review" text,
	"session_otp" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_mentor_confirmed" boolean DEFAULT false,
	"is_student_confirmed" boolean DEFAULT false,
	"is_flagged" boolean DEFAULT false,
	"flag_reason" text,
	"escrow_amount" integer,
	"payment_status" text,
	"dispute_reason" text,
	"scheduled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"session_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"rater_id" integer NOT NULL,
	"mentor_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"description" text,
	"mentor_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
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
CREATE TABLE "swipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"swiper_id" integer NOT NULL,
	"swiped_on_id" integer NOT NULL,
	"action" varchar(10) NOT NULL,
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
