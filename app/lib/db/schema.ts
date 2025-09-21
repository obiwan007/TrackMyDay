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
