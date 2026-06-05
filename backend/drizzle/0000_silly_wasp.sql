CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"bio" text,
	"avatar" text,
	"skills_teach" json DEFAULT '[]'::json,
	"skills_learn" json DEFAULT '[]'::json,
	"credits" integer DEFAULT 200,
	"trust_score" integer DEFAULT 0,
	"sessions_completed" integer DEFAULT 0,
	"average_rating" real,
	"price_per_hour" integer DEFAULT 50,
	"is_admin" integer DEFAULT 0,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_active_date" text,
	"verified_skills" json DEFAULT '[]'::json,
	"badges" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
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
	"negotiated_price" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
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
