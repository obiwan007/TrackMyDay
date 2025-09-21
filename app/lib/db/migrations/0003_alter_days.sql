-- Migration: alter days table structure
-- Changes:
-- 1. date TEXT -> INTEGER (ms timestamp)
-- 2. time_start/time_end INTEGER -> TEXT (HH:MM)
-- 3. hours INTEGER (minutes) -> REAL (decimal hours)
-- Strategy: create new table, copy & transform, drop old, rename.

PRAGMA foreign_keys=off;

BEGIN TRANSACTION;

CREATE TABLE "days_new" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"date" integer NOT NULL,
	"time_start" text NOT NULL,
	"time_end" text NOT NULL,
	"hours" real NOT NULL,
	"location" text,
	"user_id" integer NOT NULL,
	"created_at" integer,
	"updated_at" integer,
	FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- Transfer data: assume old hours column stored minutes; convert to decimal hours.
-- For time_start/time_end previously stored minutes from midnight; convert to HH:MM.
INSERT INTO "days_new" (id, date, time_start, time_end, hours, location, user_id, created_at, updated_at)
SELECT 
	id,
	-- Convert YYYY-MM-DD text to millis (midnight) using strftime (fallback to current time if parse fails)
	(CASE WHEN length(date)=10 THEN (julianday(date)||'') END),
	printf('%02d:%02d', time_start / 60, time_start % 60),
	printf('%02d:%02d', time_end / 60, time_end % 60),
	(hours / 60.0),
	location,
	user_id,
	created_at,
	updated_at
FROM days;

DROP TABLE days;
ALTER TABLE days_new RENAME TO days;

CREATE INDEX IF NOT EXISTS "days_user_id_idx" ON "days" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "days_user_date_start_unique" ON "days" ("user_id", "date", "time_start");

COMMIT;
PRAGMA foreign_keys=on;
