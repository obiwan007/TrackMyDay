<script lang="ts" setup>
const auth = useAuth();
// Using standard refs for form state
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const submitting = ref(false);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function onSubmit() {
	if (!email.value.trim() || !password.value) {
		errorMessage.value = 'Email and password are required.';
		return;
	}
	if (!emailPattern.test(email.value)) {
		errorMessage.value = 'Please enter a valid email address.';
		return;
	}
	try {
		errorMessage.value = '';
		submitting.value = true;
		await auth.login(email.value, password.value);
		await navigateTo('/');
	}
	catch (err) {
		const maybe = err as { statusMessage?: string } | undefined;
		errorMessage.value = maybe?.statusMessage || auth.error.value || 'Login failed. Please try again.';
	}
	finally {
		submitting.value = false;
	}
}
</script>

<template>
	<div>
		<article
			v-if="!auth.initialised || submitting"
			:aria-busy="true"
		/>
		<article
			v-else-if="errorMessage"
			class="error"
		>
			{{ errorMessage }}
		</article>
		<form
			v-else
			@submit.prevent="onSubmit"
		>
			<label>
				Email
				<input
					v-model="email"
					type="email"
					name="email"
					autocomplete="username"
					placeholder="you@example.com"
				>
			</label>
			<label>
				Password
				<input
					v-model="password"
					type="password"
					name="password"
					autocomplete="current-password"
					placeholder="••••••••"
				>
			</label>
			<div class="button-container">
				<button :disabled="submitting">
					Login
				</button>
			</div>
		</form>
		<p v-if="!submitting && auth.initialised">
			Need an account?
			<NuxtLink :to="{ name: 'register' }">Register</NuxtLink>
		</p>
	</div>
</template>
