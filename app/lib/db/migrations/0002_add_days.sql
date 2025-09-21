-- Migration: add days table
-- Assumptions:
-- hours stored as integer minutes (consistency with timeStart/timeEnd minute units)
-- date stored as ISO date (YYYY-MM-DD) text
-- Unique per (user_id, date, time_start) to prevent duplicate start entries (can be adjusted)

CREATE TABLE IF NOT EXISTS "days" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"date" text NOT NULL,
	"time_start" integer NOT NULL,
	"time_end" integer NOT NULL,
	"hours" integer NOT NULL,
	"location" text,
	"user_id" integer NOT NULL,
	"created_at" integer,
	"updated_at" integer,
	FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS "days_user_id_idx" ON "days" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "days_user_date_start_unique" ON "days" ("user_id", "date", "time_start");
