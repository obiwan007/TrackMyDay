// Temporary shim types so editor doesn't complain before `nuxt prepare` generates real types.
// These are intentionally loose and should be removed once the Nuxt build artifacts exist.
declare module '#app' {
	export function defineNuxtRouteMiddleware(fn: (to: unknown) => void | Promise<void>): (to: unknown) => void;
	export function navigateTo(to: unknown): Promise<void>;
}
declare module '#imports' {
	export function useAuth(): import('../app/composables/useAuth').AuthState;
}

// Global fallbacks (loose) – rely on actual Nuxt types at runtime.
declare const defineNuxtRouteMiddleware: (fn: (to: unknown) => void | Promise<void>) => (to: unknown) => void;
declare const navigateTo: (to: unknown) => Promise<void>;
declare const useAuth: () => import('../app/composables/useAuth').AuthState;
