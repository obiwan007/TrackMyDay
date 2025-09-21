import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import db from '~/lib/db';
import { days } from '~/lib/db/schema';

const IdParamsSchema = z.object({ id: z.coerce.number() });

export default defineEventHandler(async (event) => {
	const user = event.context.user;
	if (!user) {
		return sendError(event, createError({ statusCode: 401, statusMessage: 'Unauthorized' }));
	}

	const result = await getValidatedRouterParams(event, IdParamsSchema.safeParse);
	if (!result.success) {
		return sendError(event, createError({ statusCode: 422, statusMessage: 'Invalid id' }));
	}

	const row = await db.query.days.findFirst({
		where: and(eq(days.id, result.data.id), eq(days.userId, user.id)),
	});

	if (!row) {
		return sendError(event, createError({ statusCode: 404, statusMessage: 'Day not found' }));
	}

	return row;
});
