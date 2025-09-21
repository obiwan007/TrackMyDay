import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';

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
