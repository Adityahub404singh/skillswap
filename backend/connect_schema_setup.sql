BEGIN;

CREATE TABLE IF NOT EXISTS connect_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id text NOT NULL,
  title varchar(180) NOT NULL,
  slug varchar(120) NOT NULL UNIQUE,
  description text NOT NULL,
  category varchar(80) NOT NULL,
  custom_category varchar(100),
  subcategory varchar(100),
  cover_image_url text,
  format varchar(24) NOT NULL DEFAULT 'online',
  start_at timestamptz,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 1 AND 1440),
  timezone varchar(100) NOT NULL DEFAULT 'UTC',
  max_seats integer NOT NULL DEFAULT 1 CHECK (max_seats > 0),
  registration_deadline timestamptz,
  booking_type varchar(32) NOT NULL DEFAULT 'instant',
  price_type varchar(24) NOT NULL DEFAULT 'free',
  price_credits integer NOT NULL DEFAULT 0 CHECK (price_credits >= 0),
  location text,
  agenda jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  cancellation_policy text,
  status varchar(24) NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (format IN ('online','offline','hybrid')),
  CHECK (booking_type IN ('instant','host_approval','one_to_one','group','limited_seat')),
  CHECK (price_type IN ('free','credits')),
  CHECK (status IN ('draft','published','unpublished','cancelled','completed'))
);

CREATE TABLE IF NOT EXISTS connect_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES connect_activities(id) ON DELETE CASCADE,
  host_user_id text NOT NULL,
  participant_user_id text NOT NULL,
  seats integer NOT NULL DEFAULT 1 CHECK (seats > 0),
  status varchar(24) NOT NULL DEFAULT 'pending',
  note text,
  requested_start_at timestamptz,
  proposed_start_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('pending','confirmed','rejected','cancelled','completed'))
);

CREATE TABLE IF NOT EXISTS connect_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES connect_activities(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone varchar(100) NOT NULL DEFAULT 'UTC',
  valid_from date,
  valid_until date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS connect_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type varchar(80) NOT NULL,
  title varchar(180) NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connect_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind varchar(32) NOT NULL DEFAULT 'session',
  booking_id uuid REFERENCES connect_bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connect_conversation_members (
  conversation_id uuid NOT NULL REFERENCES connect_conversations(id) ON DELETE CASCADE,
  member_user_id text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, member_user_id)
);

CREATE TABLE IF NOT EXISTS connect_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES connect_conversations(id) ON DELETE CASCADE,
  sender_user_id text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(btrim(body)) > 0)
);

CREATE TABLE IF NOT EXISTS connect_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES connect_bookings(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES connect_conversations(id) ON DELETE SET NULL,
  provider varchar(40) NOT NULL DEFAULT 'jitsi',
  room_name varchar(180) NOT NULL UNIQUE,
  status varchar(24) NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('scheduled','cancelled','completed'))
);

CREATE TABLE IF NOT EXISTS connect_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES connect_activities(id) ON DELETE CASCADE,
  reporter_user_id text NOT NULL,
  reason varchar(120) NOT NULL,
  details text,
  status varchar(24) NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connect_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES connect_activities(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES connect_bookings(id) ON DELETE CASCADE,
  reviewer_user_id text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, reviewer_user_id)
);

CREATE INDEX IF NOT EXISTS connect_activities_public_idx ON connect_activities(status, start_at);
CREATE INDEX IF NOT EXISTS connect_activities_host_idx ON connect_activities(host_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS connect_bookings_activity_status_idx ON connect_bookings(activity_id, status);
CREATE INDEX IF NOT EXISTS connect_bookings_host_idx ON connect_bookings(host_user_id, status, requested_start_at);
CREATE INDEX IF NOT EXISTS connect_bookings_participant_idx ON connect_bookings(participant_user_id, status, requested_start_at);
CREATE INDEX IF NOT EXISTS connect_availability_activity_idx ON connect_availability(activity_id, is_active, weekday);
CREATE INDEX IF NOT EXISTS connect_notifications_user_created_idx ON connect_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS connect_conversation_members_user_idx ON connect_conversation_members(member_user_id, conversation_id);
CREATE INDEX IF NOT EXISTS connect_messages_conversation_created_idx ON connect_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS connect_reports_activity_status_idx ON connect_reports(activity_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS connect_reviews_activity_idx ON connect_reviews(activity_id, created_at DESC);

COMMIT;
