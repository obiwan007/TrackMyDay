<script setup lang="ts">
import { useDays } from '@/composables/useDays';
import { useAuth } from '@/composables/useAuth';

// Require authentication
definePageMeta({ requiresAuth: true });

useAuth();
const { fetchSummary, loadingSummary, error } = useDays();

// month value as YYYY-MM (default current month)
const month = ref<string>(new Date().toISOString().slice(0, 7));

interface WeekBucket {
	weekLabel: string;
	from: string;
	to: string;
	hours: number;
	days: number;
}

const weeks = ref<WeekBucket[]>([]);
const total = ref<number>(0);

function startOfMonth(ym: string) {
	return ym + '-01';
}

function endOfMonth(ym: string) {
	const parts = ym.split('-');
	const y = Number(parts[0]);
	const m = Number(parts[1]);
	// new Date(year, month, 0) with month as the following month to get last day of target month
	const lastDay = new Date(y, m, 0).getDate();
	return `${ym}-${String(lastDay).padStart(2, '0')}`;
}

function isoWeekStart(dateStr: string) {
	// Treat Monday as week start; adjust back to Monday
	const d = new Date(dateStr + 'T00:00:00');
	const day = (d.getDay() + 6) % 7; // 0=Monday
	d.setDate(d.getDate() - day);
	return d.toISOString().slice(0, 10);
}

function isoWeekEnd(dateStr: string) {
	const start = new Date(isoWeekStart(dateStr) + 'T00:00:00');
	start.setDate(start.getDate() + 6);
	return start.toISOString().slice(0, 10);
}

async function load() {
	const from = startOfMonth(month.value);
	const to = endOfMonth(month.value);
	const summary = await fetchSummary({ from, to, force: true });
	// Group days by isoWeekStart(date)
	const map = new Map<string, { hours: number; days: number; anyDate: string }>();
	for (const d of summary.days) {
		const wk = isoWeekStart(d.date);
		const existing = map.get(wk);
		if (existing) {
			existing.hours += d.totalHours;
			existing.days += d.entries;
		}
		else {
			map.set(wk, { hours: d.totalHours, days: d.entries, anyDate: d.date });
		}
	}
	const buckets: WeekBucket[] = Array.from(map.entries())
		.map(([wk, info]) => ({
			weekLabel: `${wk} – ${isoWeekEnd(info.anyDate)}`,
			from: wk,
			to: isoWeekEnd(info.anyDate),
			hours: info.hours,
			days: info.days,
		}))
		.sort((a, b) => a.from.localeCompare(b.from));
	weeks.value = buckets;
	total.value = buckets.reduce((s, b) => s + b.hours, 0);
}

watch(month, () => {
	load();
});

onMounted(() => {
	load();
});
</script>

<template>
	<section>
		<header class="header-bar">
			<h2>Weekly Summary</h2>
			<div class="actions">
				<label style="display:flex; align-items:center; gap:.4rem;">
					<span>Month</span>
					<input
						v-model="month"
						type="month"
					>
				</label>
				<button
					:disabled="loadingSummary"
					@click="load"
				>
					Reload
				</button>
			</div>
		</header>

		<p v-if="error">
			{{ error }}
		</p>
		<p v-else-if="loadingSummary && !weeks.length">
			Loading…
		</p>

		<div
			v-if="weeks.length"
			class="table-wrapper"
		>
			<table>
				<thead>
					<tr>
						<th scope="col">
							Week
						</th>
						<th scope="col">
							Hours
						</th>
						<th scope="col">
							Entries
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="w in weeks"
						:key="w.from"
					>
						<td>{{ w.weekLabel }}</td>
						<td>{{ w.hours.toFixed(2) }}</td>
						<td>{{ w.days }}</td>
					</tr>
				</tbody>
				<tfoot>
					<tr>
						<th scope="row">
							Total
						</th>
						<th scope="col">
							{{ total.toFixed(2) }}
						</th>
						<th scope="col" />
					</tr>
				</tfoot>
			</table>
		</div>
		<p v-else-if="!loadingSummary">
			No data for month.
		</p>
	</section>
</template>

<style scoped>
.header-bar { display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; }
.actions { display:flex; gap:.75rem; align-items:center; }
.table-wrapper { margin-top:1rem; overflow-x:auto; }
table { min-width:420px; }
</style>
