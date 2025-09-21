-- Migration: Revert days.date from INTEGER (ms/julian based) to TEXT (ISO YYYY-MM-DD)
-- Strategy similar to prior alteration: create new table with desired schema, transform & copy, swap.
-- We must interpret existing "date" integer values which were produced in migration 0003 using (julianday(date)||'').
-- That expression actually stored a TEXT representation of the Julian day number, not an integer unix timestamp.
-- However, the destination column in 0003 was declared INTEGER, so SQLite coerced the numeric-looking string to a number
-- representing the floating point Julian day (example: 2460310.5). We need to convert that back to YYYY-MM-DD.
-- If a row already somehow has a plain YYYY-MM-DD (edge manual inserts), we preserve it.
-- Conversion approach:
-- 1. Detect if the current value looks like a Julian day (value > 100000 and contains fractional .5 usually) OR not 10 chars.
-- 2. Use datetime(julianday_value, 'unixepoch') is NOT correct. Instead, SQLite date() can take a Julian day by prefixing 'julianday'.
-- Actually date(julianday_value) treats the numeric as day count from noon in proleptic Gregorian; date() on the float works directly.
-- So we can: date(date_column) to get YYYY-MM-DD when date_column holds julian day float.
-- If it already looks like 10-char pattern, leave it.

PRAGMA foreign_keys=off;
BEGIN TRANSACTION;

CREATE TABLE "days_new" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "date" text NOT NULL,
    "time_start" text NOT NULL,
    "time_end" text NOT NULL,
    "hours" real NOT NULL,
    "location" text,
    "user_id" integer NOT NULL,
    "created_at" integer,
    "updated_at" integer,
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- Transform and copy existing data.
INSERT INTO "days_new" (id, date, time_start, time_end, hours, location, user_id, created_at, updated_at)
SELECT
    id,
    CASE
        WHEN typeof(date) = 'text' AND length(date) = 10 THEN date -- already ISO
        WHEN typeof(date) = 'integer' OR typeof(date) = 'real' THEN date(date) -- interpret numeric as Julian day float
        ELSE date -- fallback: leave as-is
    END as date_iso,
    time_start,
    time_end,
    hours,
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
