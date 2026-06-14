import { pgTable, unique, serial, text, timestamp, integer, json, real } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const skills = pgTable("skills", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	category: text(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	mentorCount: integer("mentor_count").default(0),
}, (table) => [
	unique("skills_name_unique").on(table.name),
]);

export const transactions = pgTable("transactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	amount: integer().notNull(),
	type: text().notNull(),
	description: text(),
	sessionId: integer("session_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const sessions = pgTable("sessions", {
	id: serial().primaryKey().notNull(),
	mentorId: integer("mentor_id").notNull(),
	studentId: integer("student_id").notNull(),
	skill: text().notNull(),
	scheduledDate: timestamp("scheduled_date", { mode: 'string' }).notNull(),
	duration: integer().default(60).notNull(),
	status: text().default('requested').notNull(),
	message: text(),
	creditsAmount: integer("credits_amount").default(10).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	meetLink: text("meet_link"),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	actualDuration: integer("actual_duration"),
	isGroup: integer("is_group").default(0),
	maxStudents: integer("max_students").default(1),
	negotiatedPrice: integer("negotiated_price"),
	sessionOtp: text("session_otp"),
});

export const ratings = pgTable("ratings", {
	id: serial().primaryKey().notNull(),
	sessionId: integer("session_id").notNull(),
	mentorId: integer("mentor_id").notNull(),
	rating: integer().notNull(),
	review: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	raterId: integer("rater_id").notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	bio: text(),
	avatar: text(),
	skillsTeach: json("skills_teach").default([]),
	skillsLearn: json("skills_learn").default([]),
	credits: integer().default(200),
	trustScore: integer("trust_score").default(0),
	sessionsCompleted: integer("sessions_completed").default(0),
	averageRating: real("average_rating"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	pricePerHour: integer("price_per_hour").default(50),
	isAdmin: integer("is_admin").default(0),
	currentStreak: integer("current_streak").default(0),
	longestStreak: integer("longest_streak").default(0),
	lastActiveDate: text("last_active_date"),
	verifiedSkills: json("verified_skills").default([]),
	badges: json().default([]),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);
export const swipes = pgTable("swipes", {
    id: serial().primaryKey().notNull(),
    swiperId: integer("swiper_id").notNull(), // Jisne swipe kiya
    swipedOnId: integer("swiped_on_id").notNull(), // Jisko swipe kiya
    action: text().notNull(), // 'like' ya 'pass'
    createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const messages = pgTable("messages", {
    id: serial().primaryKey().notNull(),
    senderId: integer("sender_id").notNull(),
    receiverId: integer("receiver_id").notNull(),
    content: text().notNull(),
    isRead: integer("is_read").default(0),
    createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});