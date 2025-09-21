// Global auth middleware: only enforces auth when a page sets definePageMeta({ requiresAuth: true })
export default defineNuxtRouteMiddleware(async (to: unknown) => {
	const route = to as { meta: Record<string, unknown>; fullPath: string };
	if (!route.meta.requiresAuth) return;
	const auth = useAuth();
	if (typeof window !== 'undefined' && !auth.initialised.value) {
		await auth.fetchUser();
	}
	if (!auth.user.value) {
		return navigateTo({ name: 'login', query: { redirect: route.fullPath } });
	}
});
