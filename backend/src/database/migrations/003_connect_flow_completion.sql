-- SkillSwap Connect flow completion migration.
-- Isolated to connect_* tables; does not alter SkillSwap core tables.
BEGIN;

ALTER TABLE connect_activities
  ADD COLUMN IF NOT EXISTS agenda jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE connect_messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

ALTER TABLE connect_meetings
  ADD COLUMN IF NOT EXISTS conversation_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'connect_meetings_conversation_id_fkey'
  ) THEN
    ALTER TABLE connect_meetings
      ADD CONSTRAINT connect_meetings_conversation_id_fkey
      FOREIGN KEY (conversation_id)
      REFERENCES connect_conversations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS connect_messages_unread_idx
  ON connect_messages(conversation_id, read_at)
  WHERE read_at IS NULL;

COMMIT;
