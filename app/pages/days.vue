<script setup lang="ts">
import { useDays, type DayEntry } from '@/composables/useDays';
import { useAuth } from '@/composables/useAuth';

// Require authentication
definePageMeta({ requiresAuth: true });

const { list, fetchList, loadingList, loadingMutate, createDay, updateDay, deleteDay } = useDays();
useAuth(); // ensure auth hydrated (user not directly needed here)

const showCreate = ref(false);

interface NewDayForm {
	date: string;
	timeStart: string;
	/** End time optional: blank string means open */
	timeEnd: string;
	location: string | null;
}

const newDay = reactive<NewDayForm>({
	date: new Date().toISOString().slice(0, 10),
	timeStart: '09:00',
	// leave blank by default so user can create an open entry
	timeEnd: '',
	location: '',
});

async function load() {
	await fetchList({ force: true });
}

onMounted(load);

async function submitNew() {
	if (loadingMutate.value) return;
	await createDay({
		date: newDay.date,
		timeStart: newDay.timeStart,
		timeEnd: newDay.timeEnd || undefined, // omit if blank -> open entry
		location: newDay.location || null,
	});
	showCreate.value = false;
	newDay.location = '';
	await fetchList({ force: true });
}

const editingId = ref<number | null>(null);
const editBuffer = reactive<Record<number, { date: string; timeStart: string; timeEnd: string; location: string | null }>>({});

function startEdit(dayId: number, day: DayEntry) {
	editingId.value = dayId;
	editBuffer[dayId] = { date: day.date, timeStart: day.timeStart, timeEnd: day.timeEnd || '', location: day.location };
}

function cancelEdit() {
	if (editingId.value != null) {
		editBuffer[editingId.value] = { date: '', timeStart: '', timeEnd: '', location: null };
	}
	editingId.value = null;
}

async function saveEdit(day: DayEntry) {
	if (editingId.value == null) return;
	const buf = editBuffer[editingId.value];
	await updateDay(day.id, {
		date: buf.date,
		timeStart: buf.timeStart,
		timeEnd: buf.timeEnd || undefined,
		location: buf.location,
	});
	cancelEdit();
	await fetchList({ force: true });
}

async function remove(day: DayEntry) {
	if (!confirm('Delete this entry?')) return;
	await deleteDay(day.id);
	await fetchList({ force: true });
}
</script>

<template>
	<section>
		<header class="header-bar">
			<h2>Days</h2>
			<div class="actions">
				<button
					:aria-pressed="showCreate"
					:disabled="loadingMutate"
					@click="showCreate = !showCreate"
				>
					{{ showCreate ? 'Close' : 'Add Day' }}
				</button>
				<button
					class="secondary"
					:disabled="loadingList"
					@click="load"
				>
					Refresh
				</button>
			</div>
		</header>

		<p v-if="loadingList && !list">
			Loading…
		</p>
		<p v-else-if="!loadingList && list && list.length === 0">
			No entries yet.
		</p>

		<form
			v-if="showCreate"
			class="create-form"
			@submit.prevent="submitNew"
		>
			<label>
				<span>Date</span>
				<input
					v-model="newDay.date"
					type="date"
					required
				>
			</label>
			<label>
				<span>Start</span>
				<input
					v-model="newDay.timeStart"
					type="time"
					required
				>
			</label>
			<label>
				<span>End</span>
				<input
					v-model="newDay.timeEnd"
					type="time"
					placeholder="Leave blank if open"
				>
			</label>
			<label>
				<span>Location</span>
				<input
					v-model="newDay.location"
					type="text"
					placeholder="Optional"
				>
			</label>
			<div class="row-actions">
				<button
					type="submit"
					:disabled="loadingMutate"
				>
					Create
				</button>
				<button
					type="button"
					class="secondary"
					@click="showCreate=false"
				>
					Cancel
				</button>
			</div>
		</form>

		<div
			v-if="list && list.length"
			class="table-wrapper"
		>
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Start</th>
						<th>End</th>
						<th>Hours</th>
						<th>Location</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="d in list"
						:key="d.id"
					>
						<td>
							<template v-if="editingId === d.id">
								<input
									v-model="editBuffer[d.id].date"
									type="date"
									required
								>
							</template>
							<template v-else>
								{{ d.date }}
							</template>
						</td>
						<td>
							<template v-if="editingId === d.id">
								<input
									v-model="editBuffer[d.id].timeStart"
									type="time"
									required
								>
							</template>
							<template v-else>
								{{ d.timeStart }}
							</template>
						</td>
						<td>
							<template v-if="editingId === d.id">
								<input
									v-model="editBuffer[d.id].timeEnd"
									type="time"
									placeholder="(open)"
								>
							</template>
							<template v-else>
								{{ d.timeEnd }}
							</template>
						</td>
						<td>{{ d.hours.toFixed(2) }}</td>
						<td>
							<template v-if="editingId === d.id">
								<input
									v-model="editBuffer[d.id].location"
									type="text"
								>
							</template>
							<template v-else>
								{{ d.location || '—' }}
							</template>
						</td>
						<td class="row-actions">
							<template v-if="editingId === d.id">
								<button
									type="button"
									:disabled="loadingMutate"
									@click="saveEdit(d)"
								>
									Save
								</button>
								<button
									type="button"
									class="secondary"
									:disabled="loadingMutate"
									@click="cancelEdit"
								>
									Cancel
								</button>
							</template>
							<template v-else>
								<button
									type="button"
									:disabled="loadingMutate"
									@click="startEdit(d.id, d)"
								>
									Edit
								</button>
								<button
									type="button"
									class="secondary"
									:disabled="loadingMutate"
									@click="remove(d)"
								>
									Delete
								</button>
							</template>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>
</template>

<style scoped>
.header-bar { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
.actions { display:flex; gap:.5rem; align-items:center; }
.create-form { margin-top:1rem; display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:.75rem; align-items:end; }
.table-wrapper { overflow-x:auto; margin-top:1.25rem; }
.row-actions { display:flex; gap:.4rem; flex-wrap:wrap; }
input[type="time"] { min-width:110px; }
</style>
