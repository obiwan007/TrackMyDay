import { eq } from 'drizzle-orm';
import { z } from 'zod';
import db from '~/lib/db';
import { users } from '~/lib/db/schema';
import { createSession, verifyPassword } from '~/lib/auth';

const LoginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

export default defineEventHandler(async (event) => {
	const result = await readValidatedBody(event, LoginSchema.safeParse);
	if (!result.success) {
		return sendError(event, createError({ statusCode: 422, statusMessage: 'Invalid credentials' }));
	}
	const { email, password } = result.data;

	const user = await db.query.users.findFirst({ where: eq(users.email, email) });
	if (!user) {
		return sendError(event, createError({ statusCode: 401, statusMessage: 'Invalid email or password' }));
	}

	const ok = await verifyPassword(password, user.passwordHash);
	if (!ok) {
		return sendError(event, createError({ statusCode: 401, statusMessage: 'Invalid email or password' }));
	}

	const session = await createSession(user.id);
	setCookie(event, 'session_id', session.id, {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		// Expires in 7 days
		maxAge: 60 * 60 * 24 * 7,
	});

	return { id: user.id, email: user.email };
});
