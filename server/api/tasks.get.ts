import db from '~/lib/db';

export default defineEventHandler(async () => {
	const tasks = await db.query.tasks.findMany();
	return tasks;
});
