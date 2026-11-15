-- SkillSwap Connect isolated schema.
-- Uses existing SkillSwap user IDs as opaque text values; no users table is created or modified.
BEGIN;

CREATE TABLE IF NOT EXISTS connect_activities (
  id text PRIMARY KEY,
  host_user_id text NOT NULL,
  title varchar(140) NOT NULL,
  slug varchar(120) NOT NULL UNIQUE,
  description text NOT NULL,
  category varchar(80) NOT NULL,
  format varchar(20) NOT NULL CHECK (format IN ('online','offline','hybrid')),
  start_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 10 AND 1440),
  timezone varchar(80) NOT NULL,
  max_seats integer NOT NULL CHECK (max_seats > 0),
  booking_type varchar(30) NOT NULL,
  price_type varchar(20) NOT NULL DEFAULT 'free',
  price_credits integer NOT NULL DEFAULT 0 CHECK (price_credits >= 0),
  cover_image_url text,
  location text,
  registration_deadline timestamptz,
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','unpublished','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connect_availability (
  id text PRIMARY KEY,
  activity_id text NOT NULL REFERENCES connect_activities(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone varchar(80) NOT NULL,
  valid_from date,
  valid_until date,
  is_active boolean NOT NULL DEFAULT true,
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS connect_bookings (
  id text PRIMARY KEY,
  activity_id text NOT NULL REFERENCES connect_activities(id) ON DELETE CASCADE,
  host_user_id text NOT NULL,
  participant_user_id text NOT NULL,
  seats integer NOT NULL DEFAULT 1 CHECK (seats > 0),
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected','cancelled','completed')),
  note text,
  requested_start_at timestamptz NOT NULL,
  proposed_start_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (host_user_id <> participant_user_id)
);
CREATE INDEX IF NOT EXISTS connect_bookings_host_idx ON connect_bookings(host_user_id, status, requested_start_at);
CREATE INDEX IF NOT EXISTS connect_bookings_participant_idx ON connect_bookings(participant_user_id, status, requested_start_at);
CREATE INDEX IF NOT EXISTS connect_bookings_activity_idx ON connect_bookings(activity_id, status);

CREATE TABLE IF NOT EXISTS connect_notifications (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  type varchar(60) NOT NULL,
  title varchar(180) NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS connect_notifications_user_idx ON connect_notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS connect_conversations (
  id text PRIMARY KEY,
  kind varchar(30) NOT NULL DEFAULT 'session',
  booking_id text REFERENCES connect_bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS connect_conversation_members (
  conversation_id text NOT NULL REFERENCES connect_conversations(id) ON DELETE CASCADE,
  member_user_id text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(conversation_id, member_user_id)
);
CREATE TABLE IF NOT EXISTS connect_messages (
  id bigserial PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES connect_conversations(id) ON DELETE CASCADE,
  sender_user_id text NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS connect_messages_conversation_idx ON connect_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS connect_meetings (
  id text PRIMARY KEY,
  booking_id text NOT NULL UNIQUE REFERENCES connect_bookings(id) ON DELETE CASCADE,
  room_name varchar(180) NOT NULL UNIQUE,
  provider varchar(30) NOT NULL DEFAULT 'jitsi',
  status varchar(30) NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connect_reports (
  id bigserial PRIMARY KEY,
  activity_id text REFERENCES connect_activities(id) ON DELETE SET NULL,
  reporter_user_id text NOT NULL,
  reason varchar(120) NOT NULL,
  details text,
  status varchar(30) NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS connect_reviews (
  id bigserial PRIMARY KEY,
  activity_id text NOT NULL REFERENCES connect_activities(id) ON DELETE CASCADE,
  booking_id text NOT NULL REFERENCES connect_bookings(id) ON DELETE CASCADE,
  reviewer_user_id text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id, reviewer_user_id)
);
COMMIT;
