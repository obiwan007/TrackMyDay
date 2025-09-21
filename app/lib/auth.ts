import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import db from './db';
import { sessions } from './db/schema';
import { eq } from 'drizzle-orm';

export async function hashPassword(password: string) {
	const salt = await bcrypt.genSalt(10);
	return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
	return bcrypt.compare(password, hash);
}

export function createSessionId() {
	return randomBytes(16).toString('hex');
}

export async function createSession(userId: number, ttlMs = 1000 * 60 * 60 * 24 * 7) { // 7 days
	const id = createSessionId();
	const expiresAt = Date.now() + ttlMs;
	await db.insert(sessions).values({ id, userId, expiresAt, createdAt: Date.now() });
	return { id, expiresAt };
}

export async function getSession(sessionId: string) {
	const rows = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
	return rows[0] || null;
}

export async function deleteSession(sessionId: string) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}
