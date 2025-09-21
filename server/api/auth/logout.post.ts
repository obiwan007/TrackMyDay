import { eq } from 'drizzle-orm';
import db from '~/lib/db';
import { sessions } from '~/lib/db/schema';

export default defineEventHandler(async (event) => {
	const sessionId = getCookie(event, 'session_id');
	if (sessionId) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		deleteCookie(event, 'session_id');
	}
	// 204 No Content
	setResponseStatus(event, 204);
	return null;
});
