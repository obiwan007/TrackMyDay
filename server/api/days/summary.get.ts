import { and, eq, gte, lte, sql } from 'drizzle-orm';
import db from '~/lib/db';
import { days } from '~/lib/db/schema';
import { z } from 'zod';

const FilterSchema = z.object({
	from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export default defineEventHandler(async (event) => {
	const user = event.context.user;
	if (!user) {
		return sendError(event, createError({ statusCode: 401, statusMessage: 'Unauthorized' }));
	}

	const query = getQuery(event);
	const parsed = FilterSchema.safeParse(query);
	const conditions = [eq(days.userId, user.id)];
	if (parsed.success) {
		const { from, to } = parsed.data;
		if (from) conditions.push(gte(days.date, from));
		if (to) conditions.push(lte(days.date, to));
	}
	const whereExpr = conditions.length === 1 ? conditions[0] : and(...conditions);

	// Total hours
	const total = await db.select({ totalHours: sql`COALESCE(SUM(${days.hours}), 0)` }).from(days).where(whereExpr);

	// Per-day aggregates
	const perDay = await db.select({
		date: days.date,
		total: sql`SUM(${days.hours})`,
		entries: sql`COUNT(*)`,
	}).from(days).where(whereExpr).groupBy(days.date).orderBy(days.date);

	return {
		from: parsed.success ? parsed.data.from : undefined,
		to: parsed.success ? parsed.data.to : undefined,
		totalHours: total[0].totalHours as number,
		days: perDay.map(r => ({ date: r.date, totalHours: Number(r.total), entries: Number(r.entries) })),
	};
});
