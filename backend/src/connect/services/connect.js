import crypto from 'node:crypto';
import { httpError } from '../middleware/errors.js';

// ============================================================
// COMMON HELPERS
// ============================================================

const uid = () => crypto.randomUUID();

const slugify = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);

const asString = (value) => String(value);

const isValidDate = (value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const ensureFutureDate = (value, message = 'Date must be in the future') => {
  if (!isValidDate(value) || new Date(value).getTime() <= Date.now()) {
    throw httpError(400, message);
  }
};

const ensureNonEmpty = (value, message = 'Required value is missing') => {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw httpError(400, message);
  }
};

const safeJson = (value, fallback = []) => {
  if (value === undefined || value === null) return fallback;
  return JSON.stringify(value);
};

// ============================================================
// DATABASE HELPERS
// ============================================================

async function getActivity(db, id, lock = false) {
  const result = await db.query(
    `SELECT *
     FROM connect_activities
     WHERE id = $1
     ${lock ? 'FOR UPDATE' : ''}`,
    [id]
  );

  if (!result.rowCount) {
    throw httpError(404, 'Activity not found');
  }

  return result.rows[0];
}

function ensureOwner(activity, userId) {
  if (String(activity.host_user_id) !== String(userId)) {
    throw httpError(403, 'Only the host can perform this action');
  }
}

async function notify(
  db,
  userId,
  type,
  title,
  body,
  data = {}
) {
  if (!userId) return null;

  const result = await db.query(
    `INSERT INTO connect_notifications
       (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [
      String(userId),
      type,
      title,
      body,
      JSON.stringify(data),
    ]
  );

  const notification = result.rows[0];
  await db.query(
    `INSERT INTO connect_email_outbox
       (user_id, notification_id, event_type, payload, status, available_at)
     VALUES ($1, $2, $3, $4::jsonb, 'pending', NOW())
     ON CONFLICT (notification_id) DO NOTHING`,
    [String(userId), notification.id, type, JSON.stringify({ title, body, data })]
  );
  return notification;
}

// ============================================================
// CONVERSATION AND MEETING CREATION
// ============================================================

async function createConversation(db, booking) {
  const activity = await db.query(
    `SELECT session_type FROM connect_activities WHERE id = $1`,
    [booking.activity_id]
  );
  const isGroup = !['one_to_one', 'standard'].includes(activity.rows[0]?.session_type);

  if (isGroup) {
    const existing = await db.query(
      `SELECT conversation_id FROM connect_activity_conversations WHERE activity_id = $1`,
      [booking.activity_id]
    );
    let conversationId = existing.rows[0]?.conversation_id;
    if (!conversationId) {
      conversationId = uid();
      await db.query(
        `INSERT INTO connect_conversations (id, kind, booking_id)
         VALUES ($1, 'activity_group', NULL)`,
        [conversationId]
      );
      await db.query(
        `INSERT INTO connect_activity_conversations (activity_id, conversation_id)
         VALUES ($1, $2) ON CONFLICT (activity_id) DO NOTHING`,
        [booking.activity_id, conversationId]
      );
      const winner = await db.query(
        `SELECT conversation_id FROM connect_activity_conversations WHERE activity_id = $1`,
        [booking.activity_id]
      );
      conversationId = winner.rows[0].conversation_id;
    }
    await db.query(
      `INSERT INTO connect_conversation_members (conversation_id, member_user_id)
       VALUES ($1, $2), ($1, $3)
       ON CONFLICT (conversation_id, member_user_id) DO NOTHING`,
      [conversationId, String(booking.host_user_id), String(booking.participant_user_id)]
    );
    return conversationId;
  }

  const existing = await db.query(
    `SELECT c.id
     FROM connect_conversations c
     JOIN connect_conversation_members host_member
       ON host_member.conversation_id = c.id
      AND host_member.member_user_id = $1
     JOIN connect_conversation_members participant_member
       ON participant_member.conversation_id = c.id
      AND participant_member.member_user_id = $2
     WHERE c.booking_id = $3
     LIMIT 1`,
    [booking.host_user_id, booking.participant_user_id, booking.id]
  );
  if (existing.rowCount) return existing.rows[0].id;

  const conversationId = uid();
  await db.query(
    `INSERT INTO connect_conversations (id, kind, booking_id)
     VALUES ($1, 'session', $2)`,
    [conversationId, booking.id]
  );
  await db.query(
    `INSERT INTO connect_conversation_members (conversation_id, member_user_id)
     VALUES ($1, $2), ($1, $3)`,
    [conversationId, booking.host_user_id, booking.participant_user_id]
  );
  return conversationId;
}

async function createMeeting(db, booking, conversationId) {
  const existing = await db.query(
    `SELECT id FROM connect_meetings WHERE booking_id = $1`,
    [booking.id]
  );
  if (existing.rowCount) return existing.rows[0].id;

  const activityResult = await db.query(
    `SELECT id, session_type, delivery_mode FROM connect_activities WHERE id = $1`,
    [booking.activity_id]
  );
  if (!activityResult.rowCount) throw httpError(404, 'Activity not found');
  if (activityResult.rows[0].delivery_mode === 'offline' || booking.attendance_mode === 'offline') return null;

  let roomName;
  if (['one_to_one', 'standard'].includes(activityResult.rows[0].session_type)) {
    roomName = `skillswap-connect-${crypto.randomBytes(24).toString('hex')}`;
  } else {
    const shared = await db.query(
      `INSERT INTO connect_activity_rooms (activity_id, provider, room_name, status)
       VALUES ($1, 'jitsi', $2, 'scheduled')
       ON CONFLICT (activity_id) DO UPDATE
         SET updated_at = NOW()
       RETURNING room_name`,
      [booking.activity_id, `skillswap-connect-group-${crypto.randomBytes(24).toString('hex')}`]
    );
    roomName = shared.rows[0].room_name;
  }

  const inserted = await db.query(
    `INSERT INTO connect_meetings
       (id, booking_id, conversation_id, provider, room_name, status)
     VALUES ($1, $2, $3, 'jitsi', $4, 'scheduled')
     ON CONFLICT (booking_id) DO NOTHING
     RETURNING id`,
    [uid(), booking.id, conversationId, roomName]
  );
  if (inserted.rowCount) return inserted.rows[0].id;

  const fallback = await db.query(
    `SELECT id FROM connect_meetings WHERE booking_id = $1`,
    [booking.id]
  );
  return fallback.rows[0]?.id ?? null;
}

async function ensureBookingResources(db, booking) {
  const conversationId = await createConversation(db, booking);
  await createMeeting(db, booking, conversationId);

  const schedule = await db.query(
    `SELECT COALESCE($2::timestamptz, a.start_at) AS starts_at
     FROM connect_activities a WHERE a.id = $1`,
    [booking.activity_id, booking.requested_start_at || null]
  );
  const startsAt = schedule.rows[0]?.starts_at;
  if (startsAt) {
    const reminders = [
      ['24h', new Date(new Date(startsAt).getTime() - 24 * 60 * 60 * 1000)],
      ['1h', new Date(new Date(startsAt).getTime() - 60 * 60 * 1000)],
      ['15m', new Date(new Date(startsAt).getTime() - 15 * 60 * 1000)],
    ];
    for (const userId of [booking.host_user_id, booking.participant_user_id]) {
      for (const [kind, scheduledAt] of reminders) {
        if (scheduledAt.getTime() > Date.now()) {
          await db.query(
            `INSERT INTO connect_reminders (booking_id, user_id, reminder_kind, scheduled_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (booking_id, user_id, reminder_kind) DO NOTHING`,
            [booking.id, String(userId), kind, scheduledAt.toISOString()]
          );
        }
      }
    }
  }
  return conversationId;
}

// ============================================================
// ACTIVITY DISCOVERY
// ============================================================

export async function listActivities(db, query = {}) {
  const limit = Math.min(
    Math.max(Number.parseInt(query.limit, 10) || 24, 1),
    60
  );

  const values = [];

  const where = [
    `a.status = 'published'`,
    `(a.start_at IS NULL OR a.start_at > NOW() - INTERVAL '1 day')`,
  ];

  const search = String(query.search ?? '').trim();

  if (search) {
    values.push(`%${search}%`);

    const index = values.length;

    where.push(`(
      a.title ILIKE $${index}
      OR a.description ILIKE $${index}
      OR a.category ILIKE $${index}
      OR a.subcategory ILIKE $${index}
    )`);
  }

  if (query.category) {
    values.push(String(query.category).trim());
    where.push(`a.category = $${values.length}`);
  }

  if (query.mode) {
    values.push(String(query.mode).trim());
    where.push(`a.format = $${values.length}`);
  }

  values.push(limit);

  const result = await db.query(
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
     WHERE ${where.join(' AND ')}
     ORDER BY a.start_at ASC NULLS LAST, a.created_at DESC
     LIMIT $${values.length}`,
    values
  );

  return result.rows;
}

// ============================================================
// UNIQUE SLUG GENERATION
// ============================================================

async function generateUniqueSlug(db, title) {
  const base = slugify(title) || 'activity';

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = attempt === 0
      ? base
      : `${base}-${crypto.randomBytes(4).toString('hex')}`;

    const existing = await db.query(
      `SELECT 1
       FROM connect_activities
       WHERE slug = $1
       LIMIT 1`,
      [candidate]
    );

    if (!existing.rowCount) {
      return candidate;
    }
  }

  throw httpError(
    409,
    'Unable to generate a unique activity URL. Please try again.'
  );
}

// ============================================================
// CREATE ACTIVITY
// ============================================================

export async function createActivity(db, userId, input) {
  ensureNonEmpty(userId, 'User authentication is required');
  ensureNonEmpty(input?.title, 'Activity title is required');

  const slug = await generateUniqueSlug(db, input.title);

  const result = await db.query(
    `INSERT INTO connect_activities
       (
         host_user_id,
         title,
         slug,
         description,
         category,
         custom_category,
         subcategory,
         cover_image_url,
         format,
         session_type,
         delivery_mode,
         start_at,
         duration_minutes,
         timezone,
         max_seats,
         registration_deadline,
         booking_type,
         price_type,
         price_credits,
         location,
         agenda,
         faqs,
         cancellation_policy,
         status
       )
     VALUES
       (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
         $14, $15, $16, $17, $18, $19, $20, $21::jsonb,
         $22::jsonb, $23, 'draft'
       )
     RETURNING *`,
    [
      String(userId),
      input.title,
      slug,
      input.description,
      input.category,
      input.customCategory ?? null,
      input.subcategory ?? null,
      input.coverImageUrl ?? null,
      input.format,
      input.sessionType ?? (input.bookingType === 'one_to_one' ? 'one_to_one' : 'standard'),
      input.deliveryMode ?? input.format,
      input.startAt,
      input.durationMinutes,
      input.timezone,
      input.maxSeats,
      input.registrationDeadline ?? null,
      input.bookingType,
      input.priceType,
      input.priceCredits ?? 0,
      input.location ?? null,
      safeJson(input.agenda),
      safeJson(input.faqs),
      input.cancellationPolicy ?? null,
    ]
  );

  return result.rows[0];
}

// ============================================================
// UPDATE ACTIVITY
// ============================================================

export async function updateActivity(db, userId, id, input) {
  const activity = await getActivity(db, id);

  ensureOwner(activity, userId);

  if (!['draft', 'unpublished'].includes(activity.status)) {
    throw httpError(
      409,
      'Only draft or unpublished activities can be edited'
    );
  }

  const fieldMap = {
    title: 'title',
    description: 'description',
    category: 'category',
    customCategory: 'custom_category',
    subcategory: 'subcategory',
    coverImageUrl: 'cover_image_url',
    format: 'format',
    sessionType: 'session_type',
    deliveryMode: 'delivery_mode',
    startAt: 'start_at',
    durationMinutes: 'duration_minutes',
    timezone: 'timezone',
    maxSeats: 'max_seats',
    registrationDeadline: 'registration_deadline',
    bookingType: 'booking_type',
    priceType: 'price_type',
    priceCredits: 'price_credits',
    location: 'location',
    agenda: 'agenda',
    faqs: 'faqs',
    cancellationPolicy: 'cancellation_policy',
  };

  const jsonFields = new Set(['agenda', 'faqs']);

  const sets = [];
  const values = [];

  for (const [inputKey, column] of Object.entries(fieldMap)) {
    if (input[inputKey] === undefined) continue;

    const value = jsonFields.has(inputKey)
      ? safeJson(input[inputKey])
      : input[inputKey];

    values.push(value);

    const cast = jsonFields.has(inputKey) ? '::jsonb' : '';

    sets.push(`${column} = $${values.length}${cast}`);
  }

  if (!sets.length) {
    return activity;
  }

  values.push(id);

  const result = await db.query(
    `UPDATE connect_activities
     SET
       ${sets.join(', ')},
       updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );

  return result.rows[0];
}

// ============================================================
// PUBLISH ACTIVITY
// ============================================================

export async function publishActivity(db, userId, id) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const activity = await getActivity(client, id, true);

    ensureOwner(activity, userId);

    if (!['draft', 'unpublished'].includes(activity.status)) {
      throw httpError(
        409,
        'Activity cannot be published from its current state'
      );
    }

    ensureFutureDate(
      activity.start_at,
      'Activity start time must be in the future'
    );

    if (
      activity.registration_deadline &&
      new Date(activity.registration_deadline) >= new Date(activity.start_at)
    ) {
      throw httpError(
        400,
        'Registration deadline must be before activity start time'
      );
    }

    const result = await client.query(
      `UPDATE connect_activities
       SET
         status = 'published',
         published_at = NOW(),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// UNPUBLISH / CANCEL ACTIVITY
// ============================================================

export async function setActivityState(db, userId, id, status) {
  if (!['unpublished', 'cancelled'].includes(status)) {
    throw httpError(400, 'Unsupported activity state');
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const activity = await getActivity(client, id, true);

    ensureOwner(activity, userId);

    if (status === 'unpublished') {
      if (activity.status !== 'published') {
        throw httpError(
          409,
          'Only published activities can be unpublished'
        );
      }

      const result = await client.query(
        `UPDATE connect_activities
         SET status = 'unpublished', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      await client.query('COMMIT');

      return result.rows[0];
    }

    if (!['draft', 'unpublished', 'published'].includes(activity.status)) {
      throw httpError(409, 'Activity is already closed');
    }

    const updated = await client.query(
      `UPDATE connect_activities
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query(
      `UPDATE connect_activity_rooms
       SET status = 'cancelled', updated_at = NOW()
       WHERE activity_id = $1`,
      [id]
    );
    await client.query(
      `DELETE FROM connect_conversation_members cm
       USING connect_activity_conversations ac
       WHERE cm.conversation_id = ac.conversation_id
         AND ac.activity_id = $1
         AND cm.member_user_id <> $2`,
      [id, String(userId)]
    );

    const bookings = await client.query(
      `UPDATE connect_bookings
       SET status = 'cancelled', updated_at = NOW()
       WHERE activity_id = $1
         AND status IN ('pending', 'confirmed')
       RETURNING id, host_user_id, participant_user_id`,
      [id]
    );

    const bookingIds = bookings.rows.map((booking) => String(booking.id));

    if (bookingIds.length) {
      await client.query(
        `UPDATE connect_reminders SET status = 'cancelled'
         WHERE booking_id = ANY($1::uuid[]) AND status = 'pending'`,
        [bookingIds]
      );
      await client.query(
        `UPDATE connect_meetings
         SET status = 'cancelled', updated_at = NOW()
         WHERE booking_id = ANY($1::uuid[])`,
        [bookingIds]
      );
    }

    for (const booking of bookings.rows) {
      await notify(
        client,
        booking.participant_user_id,
        'activity_cancelled',
        'Activity cancelled',
        `The host cancelled ${activity.title}`,
        {
          activityId: id,
          bookingId: booking.id,
        }
      );
    }

    await client.query('COMMIT');

    return {
      ...updated.rows[0],
      cancelledBookings: bookings.rowCount,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}// ============================================================
// CREATE BOOKING
// ============================================================

export async function createBooking(pool, userId, activityId, input) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock activity row to prevent simultaneous bookings
    // from exceeding the seat limit.
    const activity = await getActivity(client, activityId, true);

    if (activity.status !== 'published') {
      throw httpError(409, 'Activity is not open for registration');
    }

    if (String(activity.host_user_id) === String(userId)) {
      throw httpError(400, 'Hosts cannot book their own activity');
    }

    if (activity.price_type === 'credits') {
      throw httpError(
        501,
        'Credit booking adapter is not configured. No credits were charged.'
      );
    }

    const attendanceMode = input.attendanceMode ||
      (activity.delivery_mode === 'offline' ? 'offline' : 'online');
    if (activity.delivery_mode === 'online' && attendanceMode !== 'online') {
      throw httpError(400, 'This activity only supports online attendance');
    }
    if (activity.delivery_mode === 'offline' && attendanceMode !== 'offline') {
      throw httpError(400, 'This activity only supports offline attendance');
    }
    if (!['online', 'offline'].includes(attendanceMode)) {
      throw httpError(400, 'Invalid attendance mode');
    }

    const seats = Number(input.seats);

    if (!Number.isInteger(seats) || seats < 1 || seats > 50) {
      throw httpError(400, 'Invalid seat count');
    }

    if (activity.booking_type === 'one_to_one' && seats !== 1) {
      throw httpError(
        400,
        'One-to-one bookings allow exactly one seat'
      );
    }

    if (
      activity.registration_deadline &&
      new Date(activity.registration_deadline).getTime() < Date.now()
    ) {
      throw httpError(409, 'Registration deadline has passed');
    }

    const requestedStartAt = input.requestedStartAt || activity.start_at;

    if (!isValidDate(requestedStartAt)) {
      throw httpError(400, 'Invalid requested session date');
    }

    if (new Date(requestedStartAt).getTime() <= Date.now()) {
      throw httpError(400, 'Requested session time must be in the future');
    }

    const requestedEndAt = new Date(
      new Date(requestedStartAt).getTime() + Number(activity.duration_minutes) * 60_000
    );
    const scheduleConflict = await client.query(
      `SELECT other.id
       FROM connect_bookings other
       JOIN connect_activities other_activity ON other_activity.id = other.activity_id
       WHERE other.status = 'confirmed'
         AND other.activity_id <> $5
         AND (
           other.host_user_id IN ($1, $2)
           OR other.participant_user_id IN ($1, $2)
         )
         AND tstzrange(
           COALESCE(other.requested_start_at, other_activity.start_at),
           COALESCE(other.requested_start_at, other_activity.start_at)
             + (other_activity.duration_minutes * INTERVAL '1 minute'),
           '[)'
         ) &&
         tstzrange($3::timestamptz, $4::timestamptz, '[)')
       LIMIT 1`,
      [
        String(activity.host_user_id),
        String(userId),
        new Date(requestedStartAt).toISOString(),
        requestedEndAt.toISOString(),
        activityId
      ]
    );
    if (scheduleConflict.rowCount) {
      throw httpError(409, 'Host or participant already has a confirmed session at this time');
    }

    // Prevent duplicate active bookings by the same participant.
    const duplicate = await client.query(
      `SELECT id
       FROM connect_bookings
       WHERE activity_id = $1
         AND participant_user_id = $2
         AND status IN ('pending', 'confirmed')
       LIMIT 1`,
      [activityId, String(userId)]
    );

    if (duplicate.rowCount) {
      throw httpError(
        409,
        'You already have an active booking for this activity'
      );
    }

    // Count confirmed seats while activity row is locked.
    const count = await client.query(
      `SELECT COALESCE(SUM(seats), 0)::int AS used
       FROM connect_bookings
       WHERE activity_id = $1
         AND status = 'confirmed'`,
      [activityId]
    );

    const usedSeats = Number(count.rows[0].used);
    const maxSeats = Number(activity.max_seats);

    if (usedSeats + seats > maxSeats) {
      throw httpError(409, 'Not enough seats available');
    }

    const status =
      activity.booking_type === 'host_approval'
        ? 'pending'
        : 'confirmed';

    const bookingId = uid();

    const inserted = await client.query(
      `INSERT INTO connect_bookings
         (
           id,
           activity_id,
           host_user_id,
           participant_user_id,
           seats,
           status,
           note,
           requested_start_at,
           attendance_mode
         )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        bookingId,
        activityId,
        String(activity.host_user_id),
        String(userId),
        seats,
        status,
        input.note || null,
        requestedStartAt,
        attendanceMode,
      ]
    );

    const booking = inserted.rows[0];

    await notify(
      client,
      activity.host_user_id,
      status === 'pending' ? 'booking_request' : 'booking_confirmed_host',
      status === 'pending' ? 'New booking request' : 'New participant joined',
      status === 'pending'
        ? `${seats} seat(s) requested for ${activity.title}`
        : `${seats} seat(s) booked for ${activity.title}`,
      {
        bookingId,
        activityId,
      }
    );

    if (status === 'pending') {
      await notify(
        client,
        userId,
        'booking_pending',
        'Booking request received',
        `Your request for ${activity.title} is awaiting host approval`,
        { bookingId, activityId }
      );
    }

    if (status === 'confirmed') {
      await ensureBookingResources(client, booking);

      await notify(
        client,
        userId,
        'booking_confirmed',
        'Booking confirmed',
        `Your booking for ${activity.title} is confirmed`,
        {
          bookingId,
          activityId,
        }
      );
    }

    await client.query('COMMIT');

    return booking;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// TRANSITION BOOKING
// Supported actions:
// approve, reject, cancel
// ============================================================

export async function transitionBooking(pool, userId, id, action) {
  if (!['approve', 'reject', 'cancel'].includes(action)) {
    throw httpError(400, 'Unsupported booking action');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT *
       FROM connect_bookings
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (!result.rowCount) {
      throw httpError(404, 'Booking not found');
    }

    const booking = result.rows[0];

    const isHost =
      String(booking.host_user_id) === String(userId);

    const isParticipant =
      String(booking.participant_user_id) === String(userId);

    // --------------------------------------------------------
    // APPROVE / REJECT
    // --------------------------------------------------------

    if (action === 'approve' || action === 'reject') {
      if (!isHost) {
        throw httpError(403, 'Only host can review this booking');
      }

      if (booking.status !== 'pending') {
        throw httpError(409, 'Booking is not pending');
      }

      if (action === 'approve') {
        // Lock the activity to serialize approvals and bookings.
        const activity = await getActivity(
          client,
          booking.activity_id,
          true
        );

        if (activity.status !== 'published') {
          throw httpError(
            409,
            'This activity is no longer accepting bookings'
          );
        }

        const count = await client.query(
          `SELECT COALESCE(SUM(seats), 0)::int AS used
           FROM connect_bookings
           WHERE activity_id = $1
             AND status = 'confirmed'`,
          [booking.activity_id]
        );

        const usedSeats = Number(count.rows[0].used);
        const requestedSeats = Number(booking.seats);

        if (usedSeats + requestedSeats > Number(activity.max_seats)) {
          throw httpError(409, 'No seats remain');
        }
        const startAt = booking.requested_start_at || activity.start_at;
        const endAt = new Date(new Date(startAt).getTime() + Number(activity.duration_minutes) * 60_000);
        const conflict = await client.query(
          `SELECT other.id
           FROM connect_bookings other
           JOIN connect_activities oa ON oa.id = other.activity_id
           WHERE other.status = 'confirmed'
             AND other.activity_id <> $5
             AND (other.host_user_id IN ($1, $2) OR other.participant_user_id IN ($1, $2))
             AND tstzrange(
               COALESCE(other.requested_start_at, oa.start_at),
               COALESCE(other.requested_start_at, oa.start_at) + (oa.duration_minutes * INTERVAL '1 minute'),
               '[)'
             ) && tstzrange($3::timestamptz, $4::timestamptz, '[)')
           LIMIT 1`,
          [
            String(booking.host_user_id), String(booking.participant_user_id),
            new Date(startAt).toISOString(), endAt.toISOString(), booking.activity_id
          ]
        );
        if (conflict.rowCount) {
          throw httpError(409, 'Host or participant already has a confirmed session at this time');
        }
      }

      const nextStatus =
        action === 'approve' ? 'confirmed' : 'rejected';

      const updated = await client.query(
        `UPDATE connect_bookings
         SET status = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, nextStatus]
      );

      const updatedBooking = updated.rows[0];

      if (nextStatus === 'confirmed') {
        await ensureBookingResources(client, updatedBooking);
      }

      await notify(
        client,
        booking.participant_user_id,
        `booking_${nextStatus}`,
        `Booking ${nextStatus}`,
        `Your booking was ${nextStatus}`,
        {
          bookingId: id,
          activityId: booking.activity_id,
        }
      );

      await client.query('COMMIT');

      return updatedBooking;
    }

    // --------------------------------------------------------
    // CANCEL
    // --------------------------------------------------------

    if (action === 'cancel') {
      if (!isHost && !isParticipant) {
        throw httpError(403, 'Not a booking participant');
      }

      if (!['pending', 'confirmed'].includes(booking.status)) {
        throw httpError(409, 'Booking cannot be cancelled');
      }

      const updated = await client.query(
        `UPDATE connect_bookings
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      await client.query(
        `UPDATE connect_reminders SET status = 'cancelled'
         WHERE booking_id = $1 AND status = 'pending'`,
        [id]
      );

      await client.query(
        `UPDATE connect_meetings
         SET status = 'cancelled', updated_at = NOW()
         WHERE booking_id = $1`,
        [id]
      );
      if (!isHost) {
        await client.query(
          `DELETE FROM connect_conversation_members cm
           USING connect_activity_conversations ac
           WHERE cm.conversation_id = ac.conversation_id
             AND ac.activity_id = $1
             AND cm.member_user_id = $2`,
          [booking.activity_id, String(userId)]
        );
      }

      const recipient = isHost
        ? booking.participant_user_id
        : booking.host_user_id;

      await notify(
        client,
        recipient,
        'booking_cancelled',
        'Booking cancelled',
        'A booking was cancelled',
        {
          bookingId: id,
          activityId: booking.activity_id,
        }
      );

      await client.query('COMMIT');

      return updated.rows[0];
    }

    throw httpError(400, 'Unsupported booking action');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// PROPOSE RESCHEDULE
// Host or participant can propose a new time.
// ============================================================

export async function proposeReschedule(
  pool,
  userId,
  id,
  requestedStartAt
) {
  ensureNonEmpty(requestedStartAt, 'New session time is required');

  ensureFutureDate(
    requestedStartAt,
    'New session time must be in the future'
  );

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT *
       FROM connect_bookings
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (!result.rowCount) {
      throw httpError(404, 'Booking not found');
    }

    const booking = result.rows[0];

    const isMember = [
      booking.host_user_id,
      booking.participant_user_id,
    ].map(String).includes(String(userId));

    if (!isMember) {
      throw httpError(403, 'Not a booking participant');
    }

    if (booking.status !== 'confirmed') {
      throw httpError(
        409,
        'Only confirmed bookings can be rescheduled'
      );
    }

    const updated = await client.query(
      `UPDATE connect_bookings
       SET proposed_start_at = $2, reschedule_proposed_by = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING id, proposed_start_at, reschedule_proposed_by`,
      [id, requestedStartAt, String(userId)]
    );

    const recipient =
      String(userId) === String(booking.host_user_id)
        ? booking.participant_user_id
        : booking.host_user_id;

    await notify(
      client,
      recipient,
      'reschedule_request',
      'Reschedule requested',
      'A new session time was proposed',
      {
        bookingId: id,
        requestedStartAt,
      }
    );

    await client.query('COMMIT');

    return {
      id: updated.rows[0].id,
      proposedStartAt: updated.rows[0].proposed_start_at,
      status: 'awaiting_host_confirmation',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// CONFIRM RESCHEDULE
// Only host can confirm.
// ============================================================

export async function confirmReschedule(pool, userId, id) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT *
       FROM connect_bookings
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (!result.rowCount) {
      throw httpError(404, 'Booking not found');
    }

    const booking = result.rows[0];

    const isMember = [booking.host_user_id, booking.participant_user_id]
      .map(String).includes(String(userId));
    if (!isMember) throw httpError(403, 'Not a booking participant');
    if (!booking.reschedule_proposed_by) throw httpError(409, 'No pending reschedule proposal');
    if (String(booking.reschedule_proposed_by) === String(userId)) {
      throw httpError(403, 'The other booking member must accept this proposal');
    }

    if (booking.status !== 'confirmed') {
      throw httpError(
        409,
        'Only confirmed bookings can be rescheduled'
      );
    }

    if (!booking.proposed_start_at) {
      throw httpError(409, 'No proposed time');
    }

    const activity = await getActivity(
      client,
      booking.activity_id,
      true
    );

    const proposedStart = new Date(booking.proposed_start_at);

    if (
      Number.isNaN(proposedStart.getTime()) ||
      proposedStart.getTime() <= Date.now()
    ) {
      throw httpError(400, 'Proposed time must be in the future');
    }

    const duration = Number(activity.duration_minutes);

    if (!Number.isFinite(duration) || duration <= 0) {
      throw httpError(500, 'Activity duration is invalid');
    }

    const proposedEnd = new Date(
      proposedStart.getTime() + duration * 60_000
    );

    // Check overlapping sessions involving either participant.
    const conflict = await client.query(
      `SELECT other.id
       FROM connect_bookings other
       JOIN connect_activities other_activity
         ON other_activity.id = other.activity_id
       WHERE other.id <> $1
         AND other.status = 'confirmed'
         AND (
           other.host_user_id IN ($2, $3)
           OR other.participant_user_id IN ($2, $3)
         )
         AND tstzrange(
           other.requested_start_at,
           other.requested_start_at
             + (other_activity.duration_minutes * INTERVAL '1 minute'),
           '[)'
         )
         &&
         tstzrange(
           $4::timestamptz,
           $5::timestamptz,
           '[)'
         )
       LIMIT 1`,
      [
        id,
        String(booking.host_user_id),
        String(booking.participant_user_id),
        proposedStart.toISOString(),
        proposedEnd.toISOString(),
      ]
    );

    if (conflict.rowCount) {
      throw httpError(
        409,
        'The proposed time conflicts with another confirmed session'
      );
    }

    const updated = await client.query(
      `UPDATE connect_bookings
       SET
         requested_start_at = proposed_start_at,
         proposed_start_at = NULL,
         reschedule_proposed_by = NULL,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query(
      `UPDATE connect_meetings
       SET status = 'scheduled', updated_at = NOW()
       WHERE booking_id = $1`,
      [id]
    );
    await client.query(
      `UPDATE connect_reminders SET status = 'cancelled'
       WHERE booking_id = $1 AND status = 'pending'`,
      [id]
    );
    const reminderOffsets = [
      ['24h', 24 * 60],
      ['1h', 60],
      ['15m', 15]
    ];
    for (const reminderUser of [booking.host_user_id, booking.participant_user_id]) {
      for (const [kind, minutes] of reminderOffsets) {
        const reminderAt = new Date(proposedStart.getTime() - minutes * 60_000);
        if (reminderAt.getTime() > Date.now()) {
          await client.query(
            `INSERT INTO connect_reminders (booking_id, user_id, reminder_kind, scheduled_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (booking_id, user_id, reminder_kind)
             DO UPDATE SET scheduled_at = EXCLUDED.scheduled_at, status = 'pending', attempts = 0`,
            [id, String(reminderUser), kind, reminderAt.toISOString()]
          );
        }
      }
    }

    await notify(
      client,
      booking.participant_user_id,
      'reschedule_confirmed',
      'Reschedule confirmed',
      'The host confirmed the new time',
      { bookingId: id, requestedStartAt: updated.rows[0].requested_start_at }
    );
    await notify(
      client,
      booking.host_user_id,
      'reschedule_confirmed_host',
      'Session time updated',
      'The session calendar has been updated to the confirmed time',
      { bookingId: id, requestedStartAt: updated.rows[0].requested_start_at }
    );

    await client.query('COMMIT');

    return {
      id,
      status: 'confirmed',
      requestedStartAt: updated.rows[0].requested_start_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}// ============================================================
// REJECT RESCHEDULE: only the other booking member can reject.
// ============================================================
export async function rejectReschedule(pool, userId, id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT * FROM connect_bookings WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (!result.rowCount) throw httpError(404, 'Booking not found');
    const booking = result.rows[0];
    const isMember = [booking.host_user_id, booking.participant_user_id]
      .map(String).includes(String(userId));
    if (!isMember) throw httpError(403, 'Not a booking participant');
    if (!booking.proposed_start_at || !booking.reschedule_proposed_by) {
      throw httpError(409, 'No pending reschedule proposal');
    }
    if (String(booking.reschedule_proposed_by) === String(userId)) {
      throw httpError(403, 'The other booking member must reject this proposal');
    }
    await client.query(
      `UPDATE connect_bookings
       SET proposed_start_at = NULL, reschedule_proposed_by = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
    const proposer = String(booking.reschedule_proposed_by);
    await notify(client, proposer, 'reschedule_rejected', 'Reschedule declined',
      'The other booking member declined the proposed session time.',
      { bookingId: id });
    await client.query('COMMIT');
    return { id, status: 'confirmed', rescheduleStatus: 'rejected' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// SEND MESSAGE
// Message insertion and notification creation happen together.
// ============================================================

export async function sendMessage(
  pool,
  userId,
  conversationId,
  body
) {
  const messageBody = String(body ?? '').trim();

  if (!messageBody) {
    throw httpError(400, 'Message cannot be empty');
  }

  if (messageBody.length > 5000) {
    throw httpError(400, 'Message is too long');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const membership = await client.query(
      `SELECT 1
       FROM connect_conversation_members
       WHERE conversation_id = $1
         AND member_user_id = $2
       LIMIT 1`,
      [conversationId, String(userId)]
    );

    if (!membership.rowCount) {
      throw httpError(403, 'Conversation access denied');
    }

    const inserted = await client.query(
      `INSERT INTO connect_messages
         (conversation_id, sender_user_id, body)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        conversationId,
        String(userId),
        messageBody,
      ]
    );

    const recipients = await client.query(
      `SELECT member_user_id
       FROM connect_conversation_members
       WHERE conversation_id = $1
         AND member_user_id <> $2`,
      [conversationId, String(userId)]
    );

    for (const recipient of recipients.rows) {
      await client.query(
        `INSERT INTO connect_message_receipts (message_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (message_id, user_id) DO NOTHING`,
        [inserted.rows[0].id, String(recipient.member_user_id)]
      );
      await notify(
        client,
        recipient.member_user_id,
        'new_message',
        'New message',
        'You received a new Connect message',
        { conversationId }
      );
    }

    await client.query('COMMIT');

    return inserted.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// ADD AVAILABILITY
// Checks ownership and prevents overlapping slots.
// ============================================================

export async function addAvailability(
  db,
  userId,
  activityId,
  input
) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const activity = await getActivity(
      client,
      activityId,
      true
    );

    ensureOwner(activity, userId);

    const weekday = Number(input.weekday);

    if (
      !Number.isInteger(weekday) ||
      weekday < 0 ||
      weekday > 6
    ) {
      throw httpError(400, 'Invalid weekday');
    }

    const startTime = String(input.startTime ?? '');
    const endTime = String(input.endTime ?? '');

    if (!startTime || !endTime || startTime >= endTime) {
      throw httpError(400, 'Invalid availability time range');
    }

    const timezone = String(input.timezone ?? '').trim();

    if (!timezone) {
      throw httpError(400, 'Timezone is required');
    }

    if (
      input.validFrom &&
      input.validUntil &&
      input.validUntil < input.validFrom
    ) {
      throw httpError(
        400,
        'validUntil must be on or after validFrom'
      );
    }

    // Avoid overlapping time ranges on the same weekday
    // where the date ranges overlap as well.
    const overlap = await client.query(
      `SELECT id
       FROM connect_availability
       WHERE activity_id = $1
         AND weekday = $2
         AND start_time < $4::time
         AND end_time > $3::time
         AND COALESCE(valid_until, 'infinity'::date)
             >= COALESCE($5::date, '-infinity'::date)
         AND COALESCE(valid_from, '-infinity'::date)
             <= COALESCE($6::date, 'infinity'::date)
       LIMIT 1`,
      [
        activityId,
        weekday,
        startTime,
        endTime,
        input.validFrom || null,
        input.validUntil || null,
      ]
    );

    if (overlap.rowCount) {
      throw httpError(
        409,
        'This availability overlaps an existing slot'
      );
    }

    const result = await client.query(
      `INSERT INTO connect_availability
         (
           activity_id,
           weekday,
           start_time,
           end_time,
           timezone,
           valid_from,
           valid_until
         )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        activityId,
        weekday,
        startTime,
        endTime,
        timezone,
        input.validFrom || null,
        input.validUntil || null,
      ]
    );

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// REMOVE AVAILABILITY
// Only the activity owner can remove the slot.
// ============================================================

export async function removeAvailability(
  db,
  userId,
  availabilityId
) {
  const result = await db.query(
    `DELETE FROM connect_availability av
     USING connect_activities a
     WHERE av.id = $1
       AND av.activity_id = a.id
       AND a.host_user_id = $2
     RETURNING av.id`,
    [
      availabilityId,
      String(userId),
    ]
  );

  if (!result.rowCount) {
    throw httpError(404, 'Availability slot not found');
  }

  return {
    deleted: true,
    id: result.rows[0].id,
  };
}

// ============================================================
// TEST HELPER
// ============================================================

export function slugifyForTest(value) {
  return slugify(value);
}