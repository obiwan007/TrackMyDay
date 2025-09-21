import db from '~/lib/db';
import { days, InsertDayInputSchema } from '~/lib/db/schema';

// POST /api/days
// Creates a new day entry. Server derives `hours` from timeStart/timeEnd to avoid client tampering.

export default defineEventHandler(async (event) => {
	const user = event.context.user;
	if (!user) {
		return sendError(event, createError({ statusCode: 401, statusMessage: 'Unauthorized' }));
	}

	// Manually read body so we can allow undefined/blank timeEnd and return consistent 422 errors.
	const raw = await readBody(event).catch(() => null);
	const parsed = InsertDayInputSchema.safeParse(raw || {});
	if (!parsed.success) {
		return sendError(event, createError({ statusCode: 422, statusMessage: 'Invalid day entry' }));
	}

	// Derive hours from timeStart/timeEnd (HH:MM) to ensure consistency
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

	try {
		const { timeEnd: _rawEnd, ...rest } = parsed.data;
		const [created] = await db.insert(days).values({ ...rest, timeEnd: endVal, hours, userId: user.id }).returning();
		return created;
	}
	catch (e) {
		const msg = (e as Error).message || '';
		if (msg.includes('days_user_date_start_unique')) {
			return sendError(event, createError({ statusCode: 409, statusMessage: 'Day entry already exists for date & start time' }));
		}
		throw e;
	}
});
