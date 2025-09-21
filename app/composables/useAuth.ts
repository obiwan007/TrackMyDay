import type { Ref } from 'vue';

interface User {
	id: number;
	email: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface AuthState {
	user: Ref<User | null>;
	initialised: Ref<boolean>;
	loading: Ref<boolean>;
	error: Ref<string | null>;
	fetchUser: () => Promise<void>;
	login: (email: string, password: string) => Promise<void>;
	register: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
}

// Narrow fetch error shape used by ofetch
interface FetchLikeError {
	statusMessage?: string;
	message?: string;
}

let _state: AuthState | null = null;

function extractMessage(err: unknown, fallback: string) {
	const e = err as FetchLikeError | undefined;
	return e?.statusMessage || e?.message || fallback;
}

export function useAuth(): AuthState {
	if (_state) return _state;

	const user = ref<User | null>(null);
	const initialised = ref(false);
	const loading = ref(false);
	const error = ref<string | null>(null);

	async function fetchUser() {
		try {
			loading.value = true;
			const me = await $fetch<User>('/api/auth/me', {
				method: 'GET',
				headers: { 'cache-control': 'no-cache' },
			});
			user.value = me;
			console.debug('[auth] fetched user', me.email);
		}
		catch (e) {
			user.value = null; // Not logged in
			console.debug('[auth] fetchUser no session', e);
		}
		finally {
			initialised.value = true;
			loading.value = false;
		}
	}

	async function login(email: string, password: string) {
		try {
			loading.value = true;
			error.value = null;
			const loggedIn = await $fetch<User>('/api/auth/login', {
				method: 'POST',
				body: { email, password },
			});
			user.value = loggedIn;
			initialised.value = true;
		}
		catch (err: unknown) {
			error.value = extractMessage(err, 'Login failed');
			throw err;
		}
		finally {
			loading.value = false;
		}
	}

	async function register(email: string, password: string) {
		try {
			loading.value = true;
			error.value = null;
			const created = await $fetch<User>('/api/auth/register', {
				method: 'POST',
				body: { email, password },
			});
			user.value = created;
			initialised.value = true;
		}
		catch (err: unknown) {
			error.value = extractMessage(err, 'Registration failed');
			throw err;
		}
		finally {
			loading.value = false;
		}
	}

	async function logout() {
		try {
			loading.value = true;
			await $fetch('/api/auth/logout', { method: 'POST' });
			user.value = null;
		}
		finally {
			loading.value = false;
		}
	}

	if (import.meta.client) {
		fetchUser();
	}

	_state = { user, initialised, loading, error, fetchUser, login, register, logout };
	return _state;
}
