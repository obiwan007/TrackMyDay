import { eq } from 'drizzle-orm';
import { z } from 'zod';
import db from '~/lib/db';
import { users } from '~/lib/db/schema';
import { createSession, hashPassword } from '~/lib/auth';

const RegisterSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
});

export default defineEventHandler(async (event) => {
	const result = await readValidatedBody(event, RegisterSchema.safeParse);
	if (!result.success) {
		return sendError(event, createError({ statusCode: 422, statusMessage: 'Invalid input' }));
	}
	const { email, password } = result.data;

	const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
	if (existing) {
		return sendError(event, createError({ statusCode: 409, statusMessage: 'Email already registered' }));
	}

	const passwordHash = await hashPassword(password);
	const [created] = await db.insert(users).values({ email, passwordHash }).returning();
	const session = await createSession(created.id);
	setCookie(event, 'session_id', session.id, {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 7,
	});
	return { id: created.id, email: created.email };
});
