import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, real, jsonb } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id:                   serial("id").primaryKey(),
  name:                 varchar("name", { length: 100 }).notNull(),
  email:                varchar("email", { length: 255 }).notNull().unique(),
  passwordHash:         varchar("password_hash", { length: 255 }).notNull(),
  bio:                  text("bio"),
  avatar:               varchar("avatar", { length: 500 }),
  location:             varchar("location", { length: 100 }),
  skillsTeach:          text("skills_teach").array().default([]),
  skillsLearn:          text("skills_learn").array().default([]),
  credits:              integer("credits").notNull().default(50),
  trustScore:           integer("trust_score").notNull().default(0),
  sessionsCompleted:    integer("sessions_completed").notNull().default(0),
  averageRating:        real("average_rating").notNull().default(0),
  pricePerHour:         integer("price_per_hour").notNull().default(0),
  isAdmin:              boolean("is_admin").notNull().default(false),
  currentStreak:        integer("current_streak").notNull().default(0),
  longestStreak:        integer("longest_streak").notNull().default(0),
  lastActiveDate:       date("last_active_date"),
  verifiedSkills:       text("verified_skills").array().default([]),
  badges:               jsonb("badges").default([]),
  microSessionsCount:   integer("micro_sessions_count").notNull().default(0),
  portfolioPublic:      boolean("portfolio_public").notNull().default(true),
  seoSlug:              varchar("seo_slug", { length: 100 }),
  isPremium:            boolean("is_premium").notNull().default(false),
  premiumExpiresAt:     timestamp("premium_expires_at"),
  notificationLastSent: timestamp("notification_last_sent"),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
});

export const sessionsTable = pgTable("sessions", {
  id:            serial("id").primaryKey(),
  teacherId:     integer("teacher_id").notNull(),
  learnerId:     integer("learner_id").notNull(),
  skill:         varchar("skill", { length: 100 }).notNull(),
  sessionType:   varchar("session_type", { length: 20 }).notNull().default("standard"),
  scheduledAt:   timestamp("scheduled_at").notNull(),
  duration:      integer("duration").notNull().default(60),
  status:        varchar("status", { length: 20 }).notNull().default("pending"),
  creditsUsed:   integer("credits_used").notNull().default(10),
  meetingLink:   varchar("meeting_link", { length: 500 }),
  teacherRating: real("teacher_rating"),
  learnerRating: real("learner_rating"),
  teacherReview: text("teacher_review"),
  learnerReview: text("learner_review"),
  cancelReason:  text("cancel_reason"),
  completedAt:   timestamp("completed_at"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export const skillsTable = pgTable("skills", {
  id:         serial("id").primaryKey(),
  userId:     integer("user_id").notNull(),
  skill:      varchar("skill", { length: 100 }).notNull(),
  type:       varchar("type", { length: 10 }).notNull(),
  verified:   boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

export const transactionsTable = pgTable("transactions", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull(),
  type:        varchar("type", { length: 20 }).notNull(),
  amount:      integer("amount").notNull(),
  description: text("description").notNull(),
  sessionId:   integer("session_id"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const ratingsTable = pgTable("ratings", {
  id:        serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  raterId:   integer("rater_id").notNull(),
  ratedId:   integer("rated_id").notNull(),
  score:     real("score").notNull(),
  review:    text("review"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const feedPostsTable = pgTable("feed_posts", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id").notNull(),
  type:      varchar("type", { length: 20 }).notNull(),
  content:   text("content").notNull(),
  skills:    text("skills").array().default([]),
  likes:     integer("likes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id").notNull(),
  type:      varchar("type", { length: 30 }).notNull(),
  title:     varchar("title", { length: 200 }).notNull(),
  message:   text("message").notNull(),
  isRead:    boolean("is_read").notNull().default(false),
  actionUrl: varchar("action_url", { length: 300 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
