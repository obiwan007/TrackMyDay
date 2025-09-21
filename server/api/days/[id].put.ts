import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import db from '~/lib/db';
import { days, InsertDayInputSchema } from '~/lib/db/schema';

const IdParamsSchema = z.object({ id: z.coerce.number() });

// PUT /api/days/[id]
// Full update. Server re-computes `hours` from timeStart/timeEnd` to ensure consistency.
// Using same InsertDaysSchema for full update (could create a partial for PATCH scenario)
export default defineEventHandler(async (event) => {
	const user = event.context.user;
	if (!user) {
		return sendError(event, createError({ statusCode: 401, statusMessage: 'Unauthorized' }));
	}

	const params = await getValidatedRouterParams(event, IdParamsSchema.safeParse);
	if (!params.success) {
		return sendError(event, createError({ statusCode: 422, statusMessage: 'Invalid id' }));
	}

	// Manual parsing to mirror POST handler and allow blank/undefined timeEnd
	const raw = await readBody(event).catch(() => null);
	const parsed = InsertDayInputSchema.safeParse(raw || {});
	if (!parsed.success) {
		return sendError(event, createError({ statusCode: 422, statusMessage: 'Invalid day entry' }));
	}

	// Derive hours from timeStart/timeEnd to enforce consistency
	const parseTime = (t: string) => {
		const [h, m] = t.split(':').map(Number);
		return h * 60 + m;
	};
	const startMin = parseTime(parsed.data.timeStart);
	let hours = 0;
	let endVal: string | null = null;
	if (typeof parsed.data.timeEnd === 'string' && parsed.data.timeEnd.length) {
		endVal = parsed.data.timeEnd;
		const endMin = parseTime(endVal);
		if (endMin < startMin) {
			return sendError(event, createError({ statusCode: 422, statusMessage: 'timeEnd before timeStart' }));
		}
		hours = (endMin - startMin) / 60;
	}

	// Ensure row belongs to user
	const existing = await db.query.days.findFirst({
		where: and(eq(days.id, params.data.id), eq(days.userId, user.id)),
	});
	if (!existing) {
		return sendError(event, createError({ statusCode: 404, statusMessage: 'Day not found' }));
	}

	try {
		const { timeEnd: _rawEnd, ...rest } = parsed.data;
		const updated = await db.update(days)
			.set({ ...rest, timeEnd: endVal, hours, userId: user.id, updatedAt: Date.now() })
			.where(and(eq(days.id, params.data.id), eq(days.userId, user.id)))
			.returning();
		return updated[0];
	}
	catch (e) {
		const msg = (e as Error).message || '';
		if (msg.includes('days_user_date_start_unique')) {
			return sendError(event, createError({ statusCode: 409, statusMessage: 'Day entry already exists for date & start time' }));
		}
		throw e;
	}
});
