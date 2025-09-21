import db from '../../../app/lib/db';
import { users } from '../../../app/lib/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
	const email = getQuery(event).email as string | undefined;
	if (!email) {
		throw createError({ statusCode: 400, statusMessage: 'Missing email' });
	}
	// Basic normalization (lowercase)
	const value = email.toLowerCase();
	const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, value)).limit(1);
	return { exists: existing.length > 0 };
});
