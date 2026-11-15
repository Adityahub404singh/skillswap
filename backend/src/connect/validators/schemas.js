
import { z } from "zod";

const dateTime = z.string().datetime({ offset: true });

const activityFields = z.object({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(20).max(12000),
  category: z.string().trim().min(2).max(60),
  format: z.enum(["online", "offline", "hybrid"]),
  sessionType: z.enum(["standard", "one_to_one", "group", "webinar", "mentorship", "qa", "meetup"]).optional(),
  deliveryMode: z.enum(["online", "offline", "hybrid"]).optional(),
  startAt: dateTime,
  durationMinutes: z.coerce.number().int().min(10).max(1440),
  timezone: z.string().trim().min(1).max(80),
  maxSeats: z.coerce.number().int().min(1).max(10000),
  bookingType: z.enum([
    "instant",
    "host_approval",
    "one_to_one",
    "group",
    "limited_seat"
  ]),
  priceType: z.enum(["free", "credits"]).default("free"),
  priceCredits: z.coerce.number().int().min(0).default(0),
  location: z.string().max(300).optional().nullable(),
  coverImageUrl: z.string().url().max(2000).optional().nullable(),
});

export const activityInput = activityFields.superRefine((v, ctx) => {
  if (v.bookingType === "one_to_one" && v.maxSeats !== 1) {
    ctx.addIssue({
      code: "custom",
      path: ["maxSeats"],
      message: "One-to-one activities must have one seat."
    });
  }

  if ((v.sessionType === "one_to_one" || v.bookingType === "one_to_one") && v.maxSeats !== 1) {
    ctx.addIssue({
      code: "custom",
      path: ["maxSeats"],
      message: "One-to-one activities must have exactly one seat."
    });
  }
  if ((v.deliveryMode ?? v.format) === "offline" && !v.location) {
    ctx.addIssue({
      code: "custom",
      path: ["location"],
      message: "A venue is required for offline activities."
    });
  }
  if (v.priceType === "credits" && v.priceCredits < 1) {
    ctx.addIssue({
      code: "custom",
      path: ["priceCredits"],
      message: "Credit price must be greater than zero."
    });
  }
});

export const activityPatchInput = activityFields.partial().superRefine((v, ctx) => {
  if (
    v.bookingType === "one_to_one" &&
    v.maxSeats !== undefined &&
    v.maxSeats !== 1
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["maxSeats"],
      message: "One-to-one activities must have one seat."
    });
  }

  if (
    v.priceType === "credits" &&
    v.priceCredits !== undefined &&
    v.priceCredits < 1
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["priceCredits"],
      message: "Credit price must be greater than zero."
    });
  }
});

export const bookingInput = z.object({
  seats: z.coerce.number().int().min(1).max(100),
  note: z.string().trim().max(2000).optional(),
  requestedStartAt: dateTime.optional(),
  attendanceMode: z.enum(["online", "offline"]).optional(),
});
