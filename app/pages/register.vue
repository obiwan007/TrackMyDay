<script lang="ts" setup>
const auth = useAuth();
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const emailAvailable = ref<boolean | null>(null);
const checkingEmail = ref(false);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function checkAvailability() {
	if (!emailPattern.test(email.value)) {
		emailAvailable.value = null;
		return;
	}
	checkingEmail.value = true;
	try {
		const res = await $fetch<{ exists: boolean }>(`/api/auth/check-email?email=${encodeURIComponent(email.value)}`);
		emailAvailable.value = !res.exists;
	}
	catch {
		emailAvailable.value = null;
	}
	finally {
		checkingEmail.value = false;
	}
}

watch(email, () => {
	// Debounce manually (simple) - could use useDebounceFn from vueuse if available
	const current = email.value;
	setTimeout(() => {
		if (current === email.value) void checkAvailability();
	}, 400);
});

async function onSubmit() {
	if (!email.value.trim() || !password.value || !confirmPassword.value) {
		errorMessage.value = 'All fields are required.';
		return;
	}
	if (!emailPattern.test(email.value)) {
		errorMessage.value = 'Please enter a valid email address.';
		return;
	}
	if (password.value.length < 6) {
		errorMessage.value = 'Password must be at least 6 characters.';
		return;
	}
	if (password.value !== confirmPassword.value) {
		errorMessage.value = 'Passwords do not match.';
		return;
	}
	if (emailAvailable.value === false) {
		errorMessage.value = 'Email is already registered.';
		return;
	}
	try {
		errorMessage.value = '';
		await auth.register(email.value, password.value);
		await navigateTo('/');
	}
	catch (err) {
		const maybe = err as { statusMessage?: string } | undefined;
		errorMessage.value = maybe?.statusMessage || auth.error.value || 'Registration failed. Please try again.';
	}
}
</script>

<template>
	<div>
		<article
			v-if="auth.loading.value"
			:aria-busy="true"
		/>
		<article
			v-else-if="errorMessage"
			class="error"
		>
			{{ errorMessage }}
		</article>
		<form @submit.prevent="onSubmit">
			<label>
				Email
				<input
					v-model="email"
					type="email"
					name="email"
					autocomplete="username"
					placeholder="you@example.com"
				>
				<small v-if="checkingEmail">Checking…</small>
				<small
					v-else-if="emailAvailable === true"
					style="color: var(--pico-color-green-500);"
				>Email available</small>
				<small
					v-else-if="emailAvailable === false"
					style="color: var(--pico-color-red-500);"
				>Email already registered</small>
			</label>
			<label>
				Password
				<input
					v-model="password"
					type="password"
					name="password"
					autocomplete="new-password"
					placeholder="••••••••"
				>
			</label>
			<label>
				Confirm Password
				<input
					v-model="confirmPassword"
					type="password"
					name="confirm_password"
					autocomplete="new-password"
					placeholder="••••••••"
				>
			</label>
			<div class="button-container">
				<button :disabled="auth.loading.value || checkingEmail">
					Register
				</button>
			</div>
		</form>
		<p>
			Already have an account?
			<NuxtLink :to="{ name: 'login' }">Login</NuxtLink>
		</p>
	</div>
</template>
