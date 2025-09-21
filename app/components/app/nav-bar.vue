<template>
	<nav class="container">
		<NuxtLink :to="{ name: 'index' }">
			<ul>
				<li><strong>My Weight Tracker</strong></li>
			</ul>
		</NuxtLink>
		<ul>
			<li><a href="#">About</a></li>
			<NuxtLink :to="{ name: 'create' }">Create</NuxtLink>
			<li><a href="#">Services</a></li>
			<li><a href="#">Products</a></li>
		</ul>
	</nav>
</template>
