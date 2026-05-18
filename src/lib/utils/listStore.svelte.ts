import { SvelteMap } from 'svelte/reactivity';

/**
 * createListStore
 *
 * 서버 페이지 데이터 기반 낙관적 업데이트 헬퍼.
 * - getItems: () => T[]  — 서버에서 내려오는 현재 아이템 (reactive getter)
 * - items: T[]           — 화면에 바인딩할 $derived 배열
 *
 * API:
 *   override(id, patch)       — 낙관적 값 적용 (update/hide/restore)
 *   clear(id)                 — override 제거 (서버 값으로 복귀)
 *   addPending(item)          — 낙관적 row 추가 (tmpId로 추가)
 *   replacePending(tmpId, real) — tmpId → realId 교체 (서버 응답 후)
 *   removePending(tmpId)      — tmp row 제거 (실패 롤백)
 *   remove(id)                — 서버 row 낙관적 삭제
 *   restoreRemoved(id)        — 낙관적 삭제 롤백
 */
export function createListStore<T extends { id: string }>(getItems: () => T[]) {
	const overrides = new SvelteMap<string, T>();
	const pending = $state<T[]>([]);
	const removed = new SvelteMap<string, true>();

	// items = pending + (서버 row에 override 적용)
	const items = $derived([...pending, ...getItems().map((item) => overrides.get(item.id) ?? item)]);

	const itemsWithRemove = $derived(items.filter((i) => !removed.has(i.id)));

	// ── 기존 API (유지) ──
	function override(id: string, patch: T) {
		overrides.set(id, patch);
	}
	function clear(id: string) {
		overrides.delete(id);
	}

	// ── 신규 API ──
	function addPending(item: T) {
		pending.push(item);
	}

	function replacePending(tmpId: string, real: T) {
		const idx = pending.findIndex((i) => i.id === tmpId);
		if (idx !== -1) pending.splice(idx, 1, real);
	}

	function removePending(tmpId: string) {
		const idx = pending.findIndex((i) => i.id === tmpId);
		if (idx !== -1) pending.splice(idx, 1);
	}

	function remove(id: string) {
		removed.set(id, true);
	}
	function restoreRemoved(id: string) {
		removed.delete(id);
	}

	return {
		get items() {
			return itemsWithRemove;
		},
		override,
		clear,
		addPending,
		replacePending,
		removePending,
		remove,
		restoreRemoved
	};
}
