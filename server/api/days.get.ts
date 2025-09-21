import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import db from '~/lib/db';
import { days } from '~/lib/db/schema';

export default defineEventHandler(async (event) => {
	const user = event.context.user;
	if (!user) {
		return sendError(event, createError({ statusCode: 401, statusMessage: 'Unauthorized' }));
	}

	// Optional date range filtering (?from=YYYY-MM-DD&to=YYYY-MM-DD)
	const query = getQuery(event);
	const FilterSchema = z.object({
		from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
		to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	});
	const parsed = FilterSchema.safeParse(query);

	const clauses = [eq(days.userId, user.id)];
	if (parsed.success) {
		const { from, to } = parsed.data;
		if (from) clauses.push(gte(days.date, from));
		if (to) clauses.push(lte(days.date, to));
	}
	const whereClause = clauses.length === 1 ? clauses[0] : and(...clauses);

	const rows = await db.query.days.findMany({
		where: whereClause,
		orderBy: [desc(days.date), desc(days.timeStart)],
	});
	return rows;
});
