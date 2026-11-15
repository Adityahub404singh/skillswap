import express from 'express';
import { z } from 'zod';

import {
  activityInput,
  activityPatchInput,
  bookingInput,
} from '../validators/schemas.js';

import {
  httpError,
  connectErrorHandler,
} from '../middleware/errors.js';

import * as connectService from '../services/connect.js';

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const uuidSchema = z.string().uuid();

const currentUserId = (req) => {
  const id = req.user?.id;

  if (id === undefined || id === null || String(id).trim() === '') {
    throw httpError(401, 'Authentication required');
  }

  return String(id);
};

const parseId = (value, label = 'ID') => {
  const result = uuidSchema.safeParse(value);

  if (!result.success) {
    throw httpError(400, `Invalid ${label}`);
  }

  return result.data;
};

const messageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

const availabilitySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
  timezone: z.string().trim().min(1).max(80),
  validFrom: z.string().date().optional(),
  validUntil: z.string().date().optional(),
}).superRefine((value, ctx) => {
  const toSeconds = (time) => {
    const [hours, minutes, seconds = '0'] = time.split(':');
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  };

  if (toSeconds(value.startTime) >= toSeconds(value.endTime)) {
    ctx.addIssue({
      code: 'custom',
      path: ['endTime'],
      message: 'End time must be later than start time',
    });
  }

  if (
    value.validFrom &&
    value.validUntil &&
    value.validUntil < value.validFrom
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['validUntil'],
      message: 'validUntil must be on or after validFrom',
    });
  }
});

const rescheduleSchema = z.object({
  requestedStartAt: z.string().datetime({ offset: true }),
});

const icsEscape = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

const toIcsUtc = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw httpError(500, 'Invalid calendar date');
  }

  return date.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
};

export function createConnectRouter({ pool, authenticate }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('A valid database pool is required');
  }

  if (typeof pool.connect !== 'function') {
    throw new Error('Database pool must support connect()');
  }

  if (typeof authenticate !== 'function') {
    throw new Error('Authentication middleware is required');
  }

  const router = express.Router();

  // ------------------------------------------------------------
  // PUBLIC: HEALTH
  // ------------------------------------------------------------

  router.get('/health', (_req, res) => {
    res.set('Cache-Control', 'no-store');

    res.json({
      status: 'ok',
      module: 'skillswap-connect',
    });
  });

  // ------------------------------------------------------------
  // PUBLIC: ACTIVITY DISCOVERY
  // ------------------------------------------------------------

  router.get('/activities', asyncRoute(async (req, res) => {
    const items = await connectService.listActivities(
      pool,
      req.query
    );

    res.set('Cache-Control', 'public, max-age=30');
    res.json({ items });
  }));

  router.get('/activities/:slug', asyncRoute(async (req, res) => {
    const slug = z.string().trim().min(1).max(120)
      .parse(req.params.slug);

    const result = await pool.query(
      `SELECT
         a.*,
         (
           a.max_seats - COALESCE(
             (
               SELECT SUM(b.seats)
               FROM connect_bookings b
               WHERE b.activity_id = a.id
                 AND b.status = 'confirmed'
             ),
             0
           )
         )::int AS seats_remaining
       FROM connect_activities a
       WHERE a.slug = $1
         AND a.status = 'published'`,
      [slug]
    );

    if (!result.rowCount) {
      throw httpError(404, 'Activity not found');
    }

    res.set('Cache-Control', 'public, max-age=30');
    res.json(result.rows[0]);
  }));

  router.get('/activities/:id/availability', asyncRoute(async (req, res) => {
    const activityId = parseId(req.params.id, 'activity ID');

    const result = await pool.query(
      `SELECT
         id,
         activity_id,
         weekday,
         start_time,
         end_time,
         timezone,
         valid_from,
         valid_until
       FROM connect_availability
       WHERE activity_id = $1
       ORDER BY weekday, start_time`,
      [activityId]
    );

    res.json({ items: result.rows });
  }));

  router.get('/hosts/:userId', asyncRoute(async (req, res) => {
    const hostId = z.string().trim().min(1).max(200)
      .parse(req.params.userId);

    const activities = await pool.query(
      `SELECT
         id,
         title,
         slug,
         category,
         cover_image_url,
         format,
         start_at,
         timezone
       FROM connect_activities
       WHERE host_user_id = $1
         AND status = 'published'
       ORDER BY start_at ASC
       LIMIT 30`,
      [hostId]
    );

    res.json({
      userId: hostId,
      activities: activities.rows,
    });
  }));

  // All routes below require authentication.
  router.use(authenticate);

  // ------------------------------------------------------------
  // AUTHENTICATED: HOST ACTIVITY PREVIEW
  // ------------------------------------------------------------

  router.get('/activities/:slug/preview', asyncRoute(async (req, res) => {
    const userId = currentUserId(req);

    const slug = z.string().trim().min(1).max(120)
      .parse(req.params.slug);

    const result = await pool.query(
      `SELECT *
       FROM connect_activities
       WHERE slug = $1
         AND host_user_id = $2`,
      [slug, userId]
    );

    if (!result.rowCount) {
      throw httpError(404, 'Activity not found');
    }

    res.set('Cache-Control', 'private, no-store');
    res.json(result.rows[0]);
  }));

  // ------------------------------------------------------------
  // CREATE ACTIVITY
  // ------------------------------------------------------------

  router.post('/activities', asyncRoute(async (req, res) => {
    const input = activityInput.parse(req.body);

    const activity = await connectService.createActivity(
      pool,
      currentUserId(req),
      input
    );

    res.status(201).json(activity);
  }));

  // ------------------------------------------------------------
  // UPDATE ACTIVITY
  // ------------------------------------------------------------

  router.patch('/activities/:id', asyncRoute(async (req, res) => {
    const activityId = parseId(req.params.id, 'activity ID');
    const input = activityPatchInput.parse(req.body);

    const activity = await connectService.updateActivity(
      pool,
      currentUserId(req),
      activityId,
      input
    );

    res.json(activity);
  }));

  // ------------------------------------------------------------
  // PUBLISH ACTIVITY
  // ------------------------------------------------------------

  router.post('/activities/:id/publish', asyncRoute(async (req, res) => {
    const activity = await connectService.publishActivity(
      pool,
      currentUserId(req),
      parseId(req.params.id, 'activity ID')
    );

    res.json(activity);
  }));

  // ------------------------------------------------------------
  // UNPUBLISH ACTIVITY
  // ------------------------------------------------------------

  router.post('/activities/:id/unpublish', asyncRoute(async (req, res) => {
    const activity = await connectService.setActivityState(
      pool,
      currentUserId(req),
      parseId(req.params.id, 'activity ID'),
      'unpublished'
    );

    res.json(activity);
  }));

  // ------------------------------------------------------------
  // CANCEL ACTIVITY
  // ------------------------------------------------------------

  router.post('/activities/:id/cancel', asyncRoute(async (req, res) => {
    const activity = await connectService.setActivityState(
      pool,
      currentUserId(req),
      parseId(req.params.id, 'activity ID'),
      'cancelled'
    );

    res.json(activity);
  }));

  // ------------------------------------------------------------
  // HOST'S ACTIVITIES
  // ------------------------------------------------------------

  router.get('/me/activities', asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT *
       FROM connect_activities
       WHERE host_user_id = $1
       ORDER BY created_at DESC`,
      [currentUserId(req)]
    );

    res.json({ items: result.rows });
  }));

  // ------------------------------------------------------------
  // AVAILABILITY MANAGEMENT
  // ------------------------------------------------------------

  router.post('/activities/:id/availability', asyncRoute(async (req, res) => {
    const activityId = parseId(req.params.id, 'activity ID');
    const input = availabilitySchema.parse(req.body);

    const slot = await connectService.addAvailability(
      pool,
      currentUserId(req),
      activityId,
      input
    );

    res.status(201).json(slot);
  }));

  router.delete('/availability/:id', asyncRoute(async (req, res) => {
    const slotId = parseId(req.params.id, 'availability ID');

    const result = await connectService.removeAvailability(
      pool,
      currentUserId(req),
      slotId
    );

    res.json(result);
  }));  // ------------------------------------------------------------
  // CREATE BOOKING
  // ------------------------------------------------------------

  router.post('/activities/:id/bookings', asyncRoute(async (req, res) => {
    const activityId = parseId(req.params.id, 'activity ID');
    const input = bookingInput.parse(req.body);

    const booking = await connectService.createBooking(
      pool,
      currentUserId(req),
      activityId,
      input
    );

    res.status(201).json(booking);
  }));

  // ------------------------------------------------------------
  // MY BOOKINGS
  // ------------------------------------------------------------

  router.get('/me/bookings', asyncRoute(async (req, res) => {
    const userId = currentUserId(req);

    const result = await pool.query(
      `SELECT
         b.*,
         a.title,
         a.slug,
         a.start_at,
         a.timezone,
         a.duration_minutes,
         a.format,
         a.location,
         a.host_user_id,
         (b.host_user_id = $1) AS is_host
       FROM connect_bookings b
       JOIN connect_activities a
         ON a.id = b.activity_id
       WHERE b.participant_user_id = $1
          OR b.host_user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );

    res.set('Cache-Control', 'private, no-store');
    res.json({ items: result.rows });
  }));

  // ------------------------------------------------------------
  // ACTIVITY BOOKINGS (HOST ONLY)
  // ------------------------------------------------------------

  router.get('/activities/:id/bookings', asyncRoute(async (req, res) => {
    const activityId = parseId(req.params.id, 'activity ID');
    const userId = currentUserId(req);

    const activity = await pool.query(
      `SELECT host_user_id
       FROM connect_activities
       WHERE id = $1`,
      [activityId]
    );

    if (!activity.rowCount) {
      throw httpError(404, 'Activity not found');
    }

    if (String(activity.rows[0].host_user_id) !== userId) {
      throw httpError(403, 'Only the host can view bookings');
    }

    const result = await pool.query(
      `SELECT *
       FROM connect_bookings
       WHERE activity_id = $1
       ORDER BY created_at DESC`,
      [activityId]
    );

    res.json({ items: result.rows });
  }));

  // ------------------------------------------------------------
  // BOOKING ACTIONS
  // Uses the actual transitionBooking service function.
  // ------------------------------------------------------------

  router.post('/bookings/:id/approve', asyncRoute(async (req, res) => {
    const booking = await connectService.transitionBooking(
      pool,
      currentUserId(req),
      parseId(req.params.id, 'booking ID'),
      'approve'
    );

    res.json(booking);
  }));

  router.post('/bookings/:id/reject', asyncRoute(async (req, res) => {
    const booking = await connectService.transitionBooking(
      pool,
      currentUserId(req),
      parseId(req.params.id, 'booking ID'),
      'reject'
    );

    res.json(booking);
  }));

  router.post('/bookings/:id/cancel', asyncRoute(async (req, res) => {
    const booking = await connectService.transitionBooking(
      pool,
      currentUserId(req),
      parseId(req.params.id, 'booking ID'),
      'cancel'
    );

    res.json(booking);
  }));

  // ------------------------------------------------------------
  // PROPOSE RESCHEDULE
  // ------------------------------------------------------------

  router.post('/bookings/:id/reschedule', asyncRoute(async (req, res) => {
    const bookingId = parseId(req.params.id, 'booking ID');
    const input = rescheduleSchema.parse(req.body);

    const result = await connectService.proposeReschedule(
      pool,
      currentUserId(req),
      bookingId,
      input.requestedStartAt
    );

    res.json(result);
  }));

  // ------------------------------------------------------------
  // CONFIRM RESCHEDULE (HOST ONLY, ENFORCED BY SERVICE)
  // ------------------------------------------------------------

  router.post('/bookings/:id/reschedule/confirm', asyncRoute(async (req, res) => {
    const result = await connectService.confirmReschedule(
      pool,
      currentUserId(req),
      parseId(req.params.id, 'booking ID')
    );

    res.json(result);
  }));

  // ------------------------------------------------------------
  // MY CONVERSATIONS
  // ------------------------------------------------------------

  router.get('/me/conversations', asyncRoute(async (req, res) => {
    const userId = currentUserId(req);

    const result = await pool.query(
      `SELECT
         c.id,
         c.kind,
         c.booking_id,
         c.created_at,
         (
           SELECT MAX(m.created_at)
           FROM connect_messages m
           WHERE m.conversation_id = c.id
         ) AS last_message_at,
         (
           SELECT m.body
           FROM connect_messages m
           WHERE m.conversation_id = c.id
           ORDER BY m.created_at DESC
           LIMIT 1
         ) AS last_message
       FROM connect_conversations c
       INNER JOIN connect_conversation_members cm
         ON cm.conversation_id = c.id
       WHERE cm.member_user_id = $1
       ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC`,
      [userId]
    );

    res.set('Cache-Control', 'private, no-store');
    res.json({ items: result.rows });
  }));

  // ------------------------------------------------------------
  // GET CONVERSATION MESSAGES
  // ------------------------------------------------------------

  router.get('/conversations/:id/messages', asyncRoute(async (req, res) => {
    const conversationId = parseId(
      req.params.id,
      'conversation ID'
    );

    const userId = currentUserId(req);

    const membership = await pool.query(
      `SELECT 1
       FROM connect_conversation_members
       WHERE conversation_id = $1
         AND member_user_id = $2`,
      [conversationId, userId]
    );

    if (!membership.rowCount) {
      throw httpError(403, 'Conversation access denied');
    }

    const result = await pool.query(
      `SELECT *
       FROM connect_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT 300`,
      [conversationId]
    );

    res.json({ items: result.rows });
  }));

  // ------------------------------------------------------------
  // SEND MESSAGE
  // Service checks conversation membership before inserting.
  // ------------------------------------------------------------

  router.post('/conversations/:id/messages', asyncRoute(async (req, res) => {
    const conversationId = parseId(
      req.params.id,
      'conversation ID'
    );

    const input = messageSchema.parse(req.body);

    const message = await connectService.sendMessage(
      pool,
      currentUserId(req),
      conversationId,
      input.body
    );

    res.status(201).json(message);
  }));  // ------------------------------------------------------------
  // MY NOTIFICATIONS
  // ------------------------------------------------------------

  router.get('/me/notifications', asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT *
       FROM connect_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [currentUserId(req)]
    );

    res.set('Cache-Control', 'private, no-store');
    res.json({ items: result.rows });
  }));

  // ------------------------------------------------------------
  // MARK ONE NOTIFICATION AS READ
  // ------------------------------------------------------------

  router.post('/notifications/:id/read', asyncRoute(async (req, res) => {
    const notificationId = parseId(
      req.params.id,
      'notification ID'
    );

    const result = await pool.query(
      `UPDATE connect_notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE id = $1
         AND user_id = $2
       RETURNING *`,
      [notificationId, currentUserId(req)]
    );

    if (!result.rowCount) {
      throw httpError(404, 'Notification not found');
    }

    res.json(result.rows[0]);
  }));

  // ------------------------------------------------------------
  // MARK ALL NOTIFICATIONS AS READ
  // ------------------------------------------------------------

  router.post('/notifications/read-all', asyncRoute(async (req, res) => {
    const result = await pool.query(
      `UPDATE connect_notifications
       SET read_at = NOW()
       WHERE user_id = $1
         AND read_at IS NULL`,
      [currentUserId(req)]
    );

    res.json({
      status: 'ok',
      updated: result.rowCount,
    });
  }));

  // ------------------------------------------------------------
  // MY CALENDAR
  // ------------------------------------------------------------

  router.get('/me/calendar', asyncRoute(async (req, res) => {
    const userId = currentUserId(req);

    const result = await pool.query(
      `SELECT
         b.id AS id,
         b.id AS booking_id,
         b.status,
         b.requested_start_at,
         b.host_user_id,
         b.participant_user_id,
         a.id AS activity_id,
         a.title,
         a.description,
         a.duration_minutes,
         a.timezone,
         a.format,
         a.location
       FROM connect_bookings b
       INNER JOIN connect_activities a
         ON a.id = b.activity_id
       WHERE (
         b.host_user_id = $1
         OR b.participant_user_id = $1
       )
         AND b.status = 'confirmed'
       ORDER BY b.requested_start_at ASC`,
      [userId]
    );

    res.set('Cache-Control', 'private, no-store');
    res.json({ items: result.rows });
  }));

  // ------------------------------------------------------------
  // EXPORT CALENDAR AS ICS
  // ------------------------------------------------------------

  router.get('/me/calendar.ics', asyncRoute(async (req, res) => {
    const userId = currentUserId(req);

    const result = await pool.query(
      `SELECT
         b.id AS booking_id,
         b.requested_start_at,
         a.title,
         a.description,
         a.duration_minutes
       FROM connect_bookings b
       INNER JOIN connect_activities a
         ON a.id = b.activity_id
       WHERE (
         b.host_user_id = $1
         OR b.participant_user_id = $1
       )
         AND b.status = 'confirmed'
       ORDER BY b.requested_start_at ASC`,
      [userId]
    );

    const events = [];

    for (const booking of result.rows) {
      const start = new Date(booking.requested_start_at);

      const end = new Date(
        start.getTime() +
        Number(booking.duration_minutes) * 60 * 1000
      );

      events.push(
        'BEGIN:VEVENT',
        `UID:${icsEscape(booking.booking_id)}@skillswap-connect`,
        `DTSTAMP:${toIcsUtc(new Date())}`,
        `DTSTART:${toIcsUtc(start)}`,
        `DTEND:${toIcsUtc(end)}`,
        `SUMMARY:${icsEscape(booking.title)}`,
        `DESCRIPTION:${icsEscape(booking.description)}`,
        'END:VEVENT'
      );
    }

    const calendar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'CALSCALE:GREGORIAN',
      'PRODID:-//SkillSwap//Connect//EN',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    res
      .status(200)
      .set('Cache-Control', 'private, no-store')
      .type('text/calendar')
      .attachment('skillswap-connect.ics')
      .send(calendar);
  }));

  // ------------------------------------------------------------
  // MEETING ACCESS
  // ------------------------------------------------------------

  router.get('/bookings/:id/meeting', asyncRoute(async (req, res) => {
    const bookingId = parseId(
      req.params.id,
      'booking ID'
    );

    const userId = currentUserId(req);

    const result = await pool.query(
      `SELECT
         b.id,
         b.host_user_id,
         b.participant_user_id,
         b.status AS booking_status,
         m.room_name,
         m.provider,
         m.status AS meeting_status
       FROM connect_bookings b
       LEFT JOIN connect_meetings m
         ON m.booking_id = b.id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (!result.rowCount) {
      throw httpError(404, 'Booking not found');
    }

    const booking = result.rows[0];

    const isHost =
      String(booking.host_user_id) === userId;

    const isParticipant =
      String(booking.participant_user_id) === userId;

    if (!isHost && !isParticipant) {
      throw httpError(403, 'Meeting access denied');
    }

    if (booking.booking_status !== 'confirmed') {
      throw httpError(409, 'Booking is not confirmed');
    }

    if (
      booking.meeting_status !== 'scheduled' ||
      !booking.room_name
    ) {
      throw httpError(409, 'Meeting is not available');
    }

    /*
     * SECURITY NOTE:
     *
     * This endpoint verifies SkillSwap booking membership.
     * It does not create provider-side Jitsi authentication.
     *
     * A random Jitsi room name is not equivalent to a private,
     * authenticated meeting. Anyone who obtains the room name
     * may be able to join a public Jitsi room.
     *
     * Configure JaaS JWT authentication or a private Jitsi
     * deployment before treating meetings as access-controlled.
     */

    res
      .set('Cache-Control', 'private, no-store')
      .json({
        bookingId: booking.id,
        provider: booking.provider || 'jitsi',
        roomName: booking.room_name,
        domain: 'meet.jit.si',
        bookingAuthorized: true,
        providerAuthenticated: false,
        securityNotice:
          'Booking membership is verified, but provider-side room authentication is not configured.',
      });
  }));

  // ------------------------------------------------------------
  // CENTRAL ERROR HANDLER
  // Keep this after all routes.
  // ------------------------------------------------------------

  router.use(connectErrorHandler);

  return router;
}