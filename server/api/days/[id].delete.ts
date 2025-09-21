import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import db from '~/lib/db';
import { days } from '~/lib/db/schema';

const IdParamsSchema = z.object({ id: z.coerce.number() });

// DELETE /api/days/[id]
export default defineEventHandler(async (event) => {
	const user = event.context.user;
	if (!user) {
		return sendError(event, createError({ statusCode: 401, statusMessage: 'Unauthorized' }));
	}

	const params = await getValidatedRouterParams(event, IdParamsSchema.safeParse);
	if (!params.success) {
		return sendError(event, createError({ statusCode: 422, statusMessage: 'Invalid id' }));
	}

	const existing = await db.query.days.findFirst({
		where: and(eq(days.id, params.data.id), eq(days.userId, user.id)),
	});
	if (!existing) {
		return sendError(event, createError({ statusCode: 404, statusMessage: 'Day not found' }));
	}

	await db.delete(days).where(and(eq(days.id, params.data.id), eq(days.userId, user.id)));
	return { success: true };
});
