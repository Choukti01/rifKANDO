ALTER TABLE course_lessons
  ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'youtube';

ALTER TABLE course_lessons
  ADD CONSTRAINT course_lessons_delivery_type_check
  CHECK (delivery_type IN ('youtube', 'zoom', 'telegram'));
