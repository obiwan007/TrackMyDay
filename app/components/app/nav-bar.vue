<script setup lang="ts">
const auth = useAuth();

async function onLogout() {
	if (auth.loading.value) return;
	await auth.logout();
	await navigateTo('/login');
}
</script>

<template>
	<nav class="container">
		<NuxtLink :to="{ name: 'index' }">
			<ul>
				<li><strong>My Weight Tracker</strong></li>
			</ul>
		</NuxtLink>
		<ul>
			<li><a href="#">About</a></li>
			<li><NuxtLink :to="{ name: 'create' }">Create</NuxtLink></li>
			<template v-if="auth.user.value">
				<li>{{ auth.user.value.email }}</li>
				<li>
					<button
						:disabled="auth.loading.value"
						@click="onLogout"
					>
						Logout
					</button>
				</li>
			</template>
			<template v-else>
				<li><NuxtLink :to="{ name: 'login' }">Login</NuxtLink></li>
				<li><NuxtLink :to="{ name: 'register' }">Register</NuxtLink></li>
			</template>
		</ul>
	</nav>
</template>
