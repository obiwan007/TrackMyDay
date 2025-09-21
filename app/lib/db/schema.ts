import { int, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const tasks = sqliteTable('tasks', {
	id: int().primaryKey({ autoIncrement: true }),
	title: text().notNull(),
	done: int({ mode: 'boolean' }).notNull().default(false),
	createdAt: int().$defaultFn(() => Date.now()),
	updatedAt: int()
		.$defaultFn(() => Date.now())
		.$onUpdate(() => Date.now()),
});

export const InsertTasksSchema = createInsertSchema(
	tasks,
	{
		title: field => field.min(1).max(500),
	},
).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const PatchTasksSchema = InsertTasksSchema.partial();

// Users table
export const users = sqliteTable('users', {
	id: int().primaryKey({ autoIncrement: true }),
	email: text().notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: int('created_at').$defaultFn(() => Date.now()),
	updatedAt: int('updated_at')
		.$defaultFn(() => Date.now())
		.$onUpdate(() => Date.now()),
});

// Sessions table
export const sessions = sqliteTable('sessions', {
	id: text().primaryKey(), // use random string / uuid
	userId: int('user_id').notNull().references(() => users.id),
	expiresAt: int('expires_at').notNull(),
	createdAt: int('created_at').$defaultFn(() => Date.now()),
});

export const InsertUsersSchema = createInsertSchema(users, {
	email: f => f.email(),
	passwordHash: f => f.min(60).max(100), // bcrypt hash length ~60
}).omit({ id: true, createdAt: true, updatedAt: true });

export const InsertSessionsSchema = createInsertSchema(sessions, {
	id: f => f.min(10),
}).omit({ createdAt: true });

// Days table (tracks daily time blocks for a user)
export const days = sqliteTable('days', {
	id: int().primaryKey({ autoIncrement: true }),
	// ISO calendar date YYYY-MM-DD
	date: text('date').notNull(),
	timeStart: text('time_start').notNull(),
	// Optional end time (can be added later). Null means still in progress / not ended.
	timeEnd: text('time_end'),
	hours: real('hours').notNull(), // decimal hour value
	location: text('location'),
	userId: int('user_id').notNull().references(() => users.id),
	createdAt: int('created_at').$defaultFn(() => Date.now()),
	updatedAt: int('updated_at')
		.$defaultFn(() => Date.now())
		.$onUpdate(() => Date.now()),
});

export const InsertDaysSchema = createInsertSchema(days, {
	date: f => f.regex(/^\d{4}-\d{2}-\d{2}$/),
	hours: f => f.min(0).max(24),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Client payload schema (exclude server-derived & server-populated fields)
// Client input schema for create/update: exclude server-managed fields, make optional end time allowed.
// Standalone client input schema (avoid composition issues triggering 'Invalid element' errors)
export const InsertDayInputSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	timeStart: z.string().regex(/^\d{2}:\d{2}$/),
	// Accept: valid HH:MM, empty string (treated as open), null, or undefined
	timeEnd: z.union([
		z.string().regex(/^\d{2}:\d{2}$/),
		z.literal(''),
	]).optional().nullable(),
	location: z.string().min(1).max(500).optional().nullable(),
});
