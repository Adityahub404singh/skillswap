BEGIN;

-- Connect-only additions. Existing SkillSwap users, auth, wallet and session tables are untouched.
ALTER TABLE connect_activities
  ADD COLUMN IF NOT EXISTS session_type varchar(24) NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS delivery_mode varchar(16) NOT NULL DEFAULT 'online';
ALTER TABLE connect_activities
  DROP CONSTRAINT IF EXISTS connect_activities_session_type_chk;
ALTER TABLE connect_activities
  ADD CONSTRAINT connect_activities_session_type_chk
  CHECK (session_type IN ('standard','one_to_one','group','webinar','mentorship','qa','meetup'));
UPDATE connect_activities
SET session_type = CASE WHEN booking_type = 'one_to_one' THEN 'one_to_one' ELSE 'group' END
WHERE session_type = 'standard' AND booking_type = 'one_to_one';

ALTER TABLE connect_activities
  DROP CONSTRAINT IF EXISTS connect_activities_delivery_mode_chk;
ALTER TABLE connect_activities
  ADD CONSTRAINT connect_activities_delivery_mode_chk
  CHECK (delivery_mode IN ('online','offline','hybrid'));

ALTER TABLE connect_bookings
  ADD COLUMN IF NOT EXISTS attendance_mode varchar(16) NOT NULL DEFAULT 'online';
ALTER TABLE connect_bookings
  ADD COLUMN IF NOT EXISTS reschedule_proposed_by text;
ALTER TABLE connect_bookings
  DROP CONSTRAINT IF EXISTS connect_bookings_attendance_mode_chk;
ALTER TABLE connect_bookings
  ADD CONSTRAINT connect_bookings_attendance_mode_chk
  CHECK (attendance_mode IN ('online','offline'));

-- Existing service already writes an email outbox row for each notification.
CREATE TABLE IF NOT EXISTS connect_email_outbox (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  notification_id uuid UNIQUE REFERENCES connect_notifications(id) ON DELETE SET NULL,
  event_type varchar(80) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','sent','failed','skipped')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS connect_email_outbox_ready_idx
  ON connect_email_outbox(status, available_at, created_at);

-- Message read receipts are per recipient (supports group chat seen-by lists).
ALTER TABLE connect_messages ADD COLUMN IF NOT EXISTS read_at timestamptz;
CREATE TABLE IF NOT EXISTS connect_message_receipts (
  message_id uuid NOT NULL REFERENCES connect_messages(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  read_at timestamptz,
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS connect_message_receipts_user_idx
  ON connect_message_receipts(user_id, read_at, message_id);
CREATE INDEX IF NOT EXISTS connect_messages_unread_idx
  ON connect_messages(conversation_id, created_at) WHERE read_at IS NULL;

-- A shared room per group-style activity; one-to-one continues to use per-booking rooms.
CREATE TABLE IF NOT EXISTS connect_activity_conversations (
  activity_id uuid PRIMARY KEY REFERENCES connect_activities(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL UNIQUE REFERENCES connect_conversations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connect_activity_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL UNIQUE REFERENCES connect_activities(id) ON DELETE CASCADE,
  provider varchar(40) NOT NULL DEFAULT 'jitsi',
  room_name varchar(180) NOT NULL UNIQUE,
  status varchar(24) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','cancelled','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Calendar and reminder records are isolated to Connect.
CREATE TABLE IF NOT EXISTS connect_reminders (
  id bigserial PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES connect_bookings(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  reminder_kind varchar(8) NOT NULL CHECK (reminder_kind IN ('24h','1h','15m')),
  scheduled_at timestamptz NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','sent','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, user_id, reminder_kind)
);
CREATE INDEX IF NOT EXISTS connect_reminders_due_idx
  ON connect_reminders(status, scheduled_at);

-- Allow multiple booking rows to reference the same group room.
ALTER TABLE connect_meetings DROP CONSTRAINT IF EXISTS connect_meetings_room_name_key;
CREATE INDEX IF NOT EXISTS connect_meetings_room_name_idx ON connect_meetings(room_name);

COMMIT;
