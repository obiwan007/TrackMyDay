export default defineEventHandler((event) => {
	if (!event.context.user) {
		return sendError(event, createError({ statusCode: 401, statusMessage: 'Unauthenticated' }));
	}
	return event.context.user;
});
