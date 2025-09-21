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
// map of day -> boolean has work (filled after load)
const dayActivity = ref<Record<string, { entries: number; hours: number }>>({});

const calendarWeeks = computed(() => {
	// produce a matrix of weeks, each week is an array of day objects { date, inMonth }
	const ym = month.value;
	if (!/^\d{4}-\d{2}$/.test(ym)) return [];
	const [y, mStr] = ym.split('-');
	const m = Number(mStr) - 1; // JS month index
	const first = new Date(Number(y), m, 1);
	const last = new Date(Number(y), m + 1, 0);
	// start from Monday of the week containing first day
	const start = new Date(first);
	const startDow = (start.getDay() + 6) % 7; // 0=Mon
	start.setDate(start.getDate() - startDow);
	// end at Sunday of week containing last day
	const end = new Date(last);
	const endDow = (end.getDay() + 6) % 7; // 0=Mon
	end.setDate(end.getDate() + (6 - endDow));
	const weeks: Array<Array<{ date: string; inMonth: boolean }>> = [];
	const cursor = new Date(start);
	while (cursor <= end) {
		const week: Array<{ date: string; inMonth: boolean }> = [];
		for (let i = 0; i < 7; i++) {
			const iso = cursor.toISOString().slice(0, 10);
			week.push({ date: iso, inMonth: cursor.getMonth() === m });
			cursor.setDate(cursor.getDate() + 1);
		}
		weeks.push(week);
	}
	return weeks;
});

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
	// build day activity map for calendar
	const act: Record<string, { entries: number; hours: number }> = {};
	for (const d of summary.days) {
		act[d.date] = { entries: d.entries, hours: d.totalHours };
	}
	dayActivity.value = act;
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
			<!-- Calendar Grid -->
			<div class="calendar">
				<div class="cal-header-row">
					<div
						v-for="h in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
						:key="h"
						class="cal-head"
					>
						{{ h }}
					</div>
				</div>
				<div
					v-for="(wk, wi) in calendarWeeks"
					:key="wi"
					class="cal-week"
				>
					<div
						v-for="d in wk"
						:key="d.date"
						class="cal-day"
						:class="{
							out: !d.inMonth,
							has: dayActivity[d.date],
						}"
						:title="d.date + (dayActivity[d.date] ? ' • ' + dayActivity[d.date].hours.toFixed(2) + 'h' : '')"
					>
						<span class="num">{{ d.date.slice(-2) }}</span>
					</div>
				</div>
				<div class="cal-legend">
					<span class="box has" /> Worked day
					<span class="box" /> No work
				</div>
			</div>
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
/* Calendar styles */
.calendar { margin-top:2rem; }
.cal-header-row, .cal-week { display:flex; }
.cal-head, .cal-day { width:2.25rem; height:2.25rem; display:flex; align-items:center; justify-content:center; font-size:.7rem; box-sizing:border-box; }
.cal-head { font-weight:600; }
.cal-day { border:1px solid #ddd; background:#f9f9f9; position:relative; transition:background .15s ease, color .15s ease; }
.cal-day.out { opacity:.35; }
.cal-day.has { background:#1d7f36; color:#fff; font-weight:600; }
.cal-day.has.out { filter:brightness(.85); }
.cal-day:hover { outline:2px solid #999; z-index:2; }
.cal-day .num { font-size:.65rem; line-height:1; }
.cal-legend { display:flex; gap:1.25rem; margin-top:.5rem; font-size:.75rem; align-items:center; flex-wrap:wrap; }
.cal-legend .box { width:1rem; height:1rem; display:inline-block; border:1px solid #ccc; background:#f9f9f9; margin-right:.25rem; vertical-align:middle; }
.cal-legend .box.has { background:#1d7f36; border-color:#1d7f36; }
</style>
