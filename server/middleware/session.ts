import { eq } from 'drizzle-orm';
import db from '~/lib/db';
import { sessions, users } from '~/lib/db/schema';

export default defineEventHandler(async (event) => {
	const sessionId = getCookie(event, 'session_id');
	if (!sessionId) return;

	const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) });
	if (!session) return;

	if (session.expiresAt < Date.now()) {
		// Expired: cleanup
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		deleteCookie(event, 'session_id');
		return;
	}

	const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
	if (!user) return;

	// Attach user to event context (types augmented in server/types.d.ts)
	event.context.user = { id: user.id, email: user.email };
});
