import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";
import { z } from "zod";
import { requireConnectUser, type ConnectRequest } from "../shared/auth.js";
import { createBooking } from "../services/connect.js";

const createActivitySchema = z.object({
  title: z.string().trim().min(4).max(120),
  slug: z.string().trim().min(3).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(20).max(10000),
  category: z.string().trim().min(2).max(80),
  startAt: z.string().datetime(),
  timezone: z.string().default("Asia/Kolkata"),
  durationMinutes: z.number().int().min(15).max(480),
  maxSeats: z.number().int().min(1).max(500).default(1),
  bookingType: z.enum(["instant", "approval"]).default("instant"),
  locationType: z.enum(["online", "offline"]).default("online"),
  coverImageUrl: z.string().url().optional().nullable()
});

export function activitiesRouter(pool: Pool) {
  const router = Router();

  // Public: published activities only.
  router.get("/", async (req, res) => {
    const q = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 24), 1), 60);
    const result = await pool.query(
      `SELECT a.id, a.slug, a.title, a.description, a.category, a.start_at,
              a.timezone, a.duration_minutes, a.location_type, a.cover_image_url,
              a.booking_type, a.max_seats,
              GREATEST(a.max_seats - COALESCE(SUM(b.seats) FILTER (WHERE b.status='confirmed'),0),0)::int AS seats_available,
              u.name AS host_name
       FROM connect_activities a
       LEFT JOIN connect_bookings b ON b.activity_id=a.id
       LEFT JOIN users u ON u.id=a.host_user_id
       WHERE a.status='published'
         AND ($1='' OR a.title ILIKE '%'||$1||'%' OR a.description ILIKE '%'||$1||'%')
         AND ($2='' OR a.category=$2)
       GROUP BY a.id,u.name
       ORDER BY a.start_at ASC LIMIT $3`,
      [q, category, limit]
    );
    res.json({ items: result.rows });
  });

  // Public: a shareable activity landing page. Drafts are never exposed.
  router.get("/:slug", async (req, res) => {
    const result = await pool.query(
      `SELECT a.id,a.slug,a.title,a.description,a.category,a.start_at,a.timezone,
              a.duration_minutes,a.location_type,a.cover_image_url,a.booking_type,
              a.max_seats,u.name AS host_name
       FROM connect_activities a
       LEFT JOIN users u ON u.id=a.host_user_id
       WHERE a.slug=$1 AND a.status='published'`,
      [req.params.slug]
    );
    if (!result.rowCount) return res.status(404).json({ success:false, message:"Activity not found" });
    res.json({ activity: result.rows[0] });
  });

  // Authenticated: create a draft owned by current user.
  router.post("/", requireConnectUser, async (req: ConnectRequest, res) => {
    const parsed = createActivitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success:false, message:"Invalid activity", issues:parsed.error.issues });
    const x = parsed.data;
    const result = await pool.query(
      `INSERT INTO connect_activities
       (host_user_id,slug,title,description,category,start_at,timezone,duration_minutes,
        max_seats,booking_type,location_type,cover_image_url,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft')
       RETURNING *`,
      [req.connectUser!.id,x.slug,x.title,x.description,x.category,x.startAt,x.timezone,
       x.durationMinutes,x.maxSeats,x.bookingType,x.locationType,x.coverImageUrl || null]
    );
    res.status(201).json({ activity: result.rows[0] });
  });

  router.post("/:id/publish", requireConnectUser, async (req: ConnectRequest, res) => {
    const result = await pool.query(
      `UPDATE connect_activities SET status='published',updated_at=NOW()
       WHERE id=$1 AND host_user_id=$2 AND status IN ('draft','unpublished') RETURNING *`,
      [req.params.id,req.connectUser!.id]
    );
    if (!result.rowCount) return res.status(404).json({ success:false,message:"Activity not found or cannot be published" });
    res.json({ activity: result.rows[0], publicUrl: `/connect/events/${result.rows[0].slug}` });
  });

  router.post("/:id/bookings", requireConnectUser, async (req: ConnectRequest, res) => {
    const seats = Math.min(Math.max(Number(req.body?.seats || 1),1),10);
    const message = String(req.body?.message || "").slice(0,1000);
    try {
      const booking = await createBooking(pool, {
        activityId: req.params.id,
        participantId: req.connectUser!.id,
        seats,
        message
      });
      res.status(201).json({ booking });
    } catch (e:any) {
      res.status(e.status || 400).json({ success:false,message:e.message || "Booking failed" });
    }
  });

  return router;
}
