// Local lightweight Ref type to avoid module resolution issues during editing.
type Ref<T> = { value: T };

export interface DayEntry {
	id: number;
	date: string; // YYYY-MM-DD
	timeStart: string; // HH:MM
	timeEnd: string | null; // nullable until closed
	hours: number; // server-computed decimal hours
	location: string | null;
	userId: number;
	createdAt?: number | null;
	updatedAt?: number | null;
	open: boolean; // derived client-side flag: true if timeEnd is null
}

export interface DaysSummaryDay {
	date: string;
	totalHours: number;
	entries: number;
}

export interface DaysSummaryResult {
	from?: string;
	to?: string;
	totalHours: number;
	days: DaysSummaryDay[];
}

interface DaysStateInternal {
	list: Ref<DayEntry[] | null>;
	loadingList: Ref<boolean>;
	loadingMutate: Ref<boolean>;
	loadingSummary: Ref<boolean>;
	error: Ref<string | null>;
	byId: Ref<Map<number, DayEntry>>;
	summaries: Ref<Map<string, DaysSummaryResult>>;
}

type DayInput = Omit<DayEntry, 'id' | 'hours' | 'userId' | 'createdAt' | 'updatedAt' | 'open'>;

export interface UseDays extends Omit<DaysStateInternal, 'byId' | 'summaries'> {
	fetchList: (opts?: { from?: string; to?: string; force?: boolean }) => Promise<DayEntry[]>;
	fetchSummary: (opts?: { from?: string; to?: string; force?: boolean }) => Promise<DaysSummaryResult>;
	getById: (id: number) => Promise<DayEntry | null>;
	createDay: (input: DayInput) => Promise<DayEntry>;
	updateDay: (id: number, input: DayInput) => Promise<DayEntry>;
	deleteDay: (id: number) => Promise<void>;
	closeDay: (id: number, endTime?: string) => Promise<DayEntry>;
	invalidateList: () => void;
	invalidateSummary: (opts?: { from?: string; to?: string }) => void;
}

let _instance: UseDays | null = null;

function cacheKey(from?: string, to?: string) {
	return `${from || ''}:${to || ''}`;
}

function validateTimeRange(start: string, end?: string | null) {
	if (!end) return; // open entry ok
	const parse = (t: string) => {
		const parts = t.split(':');
		if (parts.length !== 2) throw new Error('Invalid time format');
		const h = Number(parts[0]);
		const m = Number(parts[1]);
		if (!Number.isFinite(h) || !Number.isFinite(m)) throw new Error('Invalid time number');
		return h * 60 + m;
	};
	const s = parse(start);
	const e = parse(end);
	if (e < s) throw new Error('timeEnd before timeStart');
}

export function useDays(): UseDays {
	if (_instance) return _instance;

	const list = ref<DayEntry[] | null>(null);
	const loadingList = ref(false);
	const loadingMutate = ref(false);
	const loadingSummary = ref(false);
	const error = ref<string | null>(null);
	const byId = ref(new Map<number, DayEntry>());
	const summaries = ref(new Map<string, DaysSummaryResult>());

	async function fetchList(opts: { from?: string; to?: string; force?: boolean } = {}) {
		const { from, to, force } = opts;
		if (!force && list.value) return list.value;
		try {
			loadingList.value = true;
			error.value = null;
			const rows = await $fetch<Omit<DayEntry, 'open'>[]>('/api/days', { query: { from, to } });
			const enriched: DayEntry[] = rows.map(r => ({ ...r, open: r.timeEnd == null }));
			list.value = enriched;
			enriched.forEach(r => byId.value.set(r.id, r));
			return enriched;
		}
		catch (e) {
			const err = e as { statusMessage?: string; message?: string };
			error.value = err?.statusMessage || err?.message || 'Failed to load days';
			throw e;
		}
		finally {
			loadingList.value = false;
		}
	}

	async function fetchSummary(opts: { from?: string; to?: string; force?: boolean } = {}) {
		const { from, to, force } = opts;
		const key = cacheKey(from, to);
		if (!force && summaries.value.has(key)) return summaries.value.get(key)!;
		try {
			loadingSummary.value = true;
			error.value = null;
			const summary = await $fetch<DaysSummaryResult>('/api/days/summary', { query: { from, to } });
			summaries.value.set(key, summary);
			return summary;
		}
		catch (e) {
			const err = e as { statusMessage?: string; message?: string };
			error.value = err?.statusMessage || err?.message || 'Failed to load summary';
			throw e;
		}
		finally {
			loadingSummary.value = false;
		}
	}

	async function getById(id: number): Promise<DayEntry | null> {
		if (byId.value.has(id)) return byId.value.get(id)!;
		try {
			const row = await $fetch<DayEntry>(`/api/days/${id}`);
			const enriched: DayEntry = { ...row, open: row.timeEnd == null };
			byId.value.set(enriched.id, enriched);
			return enriched;
		}
		catch (e) {
			const err = e as { statusCode?: number };
			if (err?.statusCode === 404) return null;
			throw e;
		}
	}

	function invalidateList() {
		list.value = null;
	}

	function invalidateSummary(opts: { from?: string; to?: string } = {}) {
		if (!opts.from && !opts.to) {
			summaries.value.clear();
			return;
		}
		summaries.value.delete(cacheKey(opts.from, opts.to));
	}

	async function createDay(input: DayInput) {
		validateTimeRange(input.timeStart, input.timeEnd);
		try {
			loadingMutate.value = true;
			error.value = null;
			const created = await $fetch<DayEntry>('/api/days', { method: 'POST', body: input });
			const enriched: DayEntry = { ...created, open: created.timeEnd == null };
			byId.value.set(enriched.id, enriched);
			if (list.value) {
				list.value = [...list.value, enriched].sort((a: DayEntry, b: DayEntry) => {
					return a.date === b.date
						? b.timeStart.localeCompare(a.timeStart)
						: b.date.localeCompare(a.date);
				});
			}
			invalidateSummary();
			return enriched;
		}
		catch (e) {
			const err = e as { statusMessage?: string; message?: string };
			error.value = err?.statusMessage || err?.message || 'Failed to create day';
			throw e;
		}
		finally {
			loadingMutate.value = false;
		}
	}

	async function updateDay(id: number, input: DayInput) {
		validateTimeRange(input.timeStart, input.timeEnd);
		try {
			loadingMutate.value = true;
			error.value = null;
			const updated = await $fetch<DayEntry>(`/api/days/${id}`, { method: 'PUT', body: input });
			const enriched: DayEntry = { ...updated, open: updated.timeEnd == null };
			byId.value.set(enriched.id, enriched);
			if (list.value) {
				list.value = list.value
					.map((r: DayEntry) => (r.id === id ? enriched : r))
					.sort((a: DayEntry, b: DayEntry) => {
						return a.date === b.date
							? b.timeStart.localeCompare(a.timeStart)
							: b.date.localeCompare(a.date);
					});
			}
			invalidateSummary();
			return enriched;
		}
		catch (e) {
			const err = e as { statusMessage?: string; message?: string };
			error.value = err?.statusMessage || err?.message || 'Failed to update day';
			throw e;
		}
		finally {
			loadingMutate.value = false;
		}
	}

	async function deleteDay(id: number) {
		try {
			loadingMutate.value = true;
			error.value = null;
			await $fetch(`/api/days/${id}`, { method: 'DELETE' });
			byId.value.delete(id);
			if (list.value) {
				list.value = list.value.filter((r: DayEntry) => r.id !== id);
			}
			invalidateSummary();
		}
		catch (e) {
			const err = e as { statusMessage?: string; message?: string };
			error.value = err?.statusMessage || err?.message || 'Failed to delete day';
			throw e;
		}
		finally {
			loadingMutate.value = false;
		}
	}

	async function closeDay(id: number, endTime?: string) {
		const existing = await getById(id);
		if (!existing) throw new Error('Day not found');
		if (!existing.open) return existing; // already closed
		const end = endTime || new Date().toISOString().slice(11, 16); // current HH:MM
		return updateDay(id, { date: existing.date, timeStart: existing.timeStart, timeEnd: end, location: existing.location });
	}

	_instance = {
		list,
		loadingList,
		loadingMutate,
		loadingSummary,
		error,
		fetchList,
		fetchSummary,
		getById,
		createDay,
		updateDay,
		deleteDay,
		closeDay,
		invalidateList,
		invalidateSummary,
	} as UseDays;

	return _instance;
}
