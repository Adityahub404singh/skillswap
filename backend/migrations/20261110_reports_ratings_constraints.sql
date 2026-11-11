-- Run after confirming there are no duplicate rows.
-- Check duplicates first:
-- SELECT session_id, COUNT(*) FROM ratings GROUP BY session_id HAVING COUNT(*) > 1;
-- SELECT reporter_id, reported_user_id, COUNT(*)
-- FROM reports WHERE status = 'pending'
-- GROUP BY reporter_id, reported_user_id HAVING COUNT(*) > 1;

-- Enforce one rating per session at database level.
CREATE UNIQUE INDEX IF NOT EXISTS ratings_session_id_uq
  ON ratings (session_id);

-- Prevent repeated pending reports from the same reporter against the same user.
CREATE UNIQUE INDEX IF NOT EXISTS reports_one_pending_per_reporter_target_uq
  ON reports (reporter_id, reported_user_id)
  WHERE status = 'pending';

-- Keep ratings within the expected range.
ALTER TABLE ratings
  ADD CONSTRAINT ratings_rating_range_check
  CHECK (rating BETWEEN 1 AND 5);
