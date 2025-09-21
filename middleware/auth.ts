// Named auth middleware: opt-in via definePageMeta({ middleware: ['auth'] }) or per-page meta requiresAuth.
import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import { useAuth } from '#imports';

export default defineNuxtRouteMiddleware(async (to) => {
	// Only proceed if middleware explicitly included or requiresAuth flag set
	const metaMw = (to.meta.middleware as string[] | undefined) || [];
	if (!metaMw.includes('auth') && !to.meta.requiresAuth) return;

	const auth = useAuth();
	const isClient = typeof window !== 'undefined';
	if (isClient && !auth.initialised.value) {
		await auth.fetchUser();
	}
	if (!auth.user.value) {
		return navigateTo({ name: 'login', query: { redirect: to.fullPath } });
	}
});
