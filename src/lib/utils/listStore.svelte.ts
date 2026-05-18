import { SvelteMap } from 'svelte/reactivity';

/**
 * createListStore
 *
 * 서버 페이지 데이터 기반 낙관적 업데이트 헬퍼.
 * - getItems: () => T[]  — 서버에서 내려오는 현재 페이지 아이템 (reactive getter)
 * - items: T[]           — 화면에 바인딩할 $derived 배열 (overrides 반영됨)
 * - override(id, patch)  — 낙관적 값 적용
 * - clear(id)            — override 제거 (서버 값으로 복귀)
 *
 * create는 저장 후 navTo({ page: 1 }) 패턴을 사용하므로 이 헬퍼 범위 밖.
 *
 * 사용 예)
 *   const list = createListStore(() => data.clients);
 *   // 수정
 *   list.override(id, optimistic);
 *   modal.close();
 *   const saved = await submitAction('update', payload, () => list.clear(id));
 *   list.clear(id);
 *   if (saved) list.override(id, saved);
 */
export function createListStore<T extends { id: string }>(getItems: () => T[]) {
  const overrides = new SvelteMap<string, T>();

  const items = $derived(
    getItems().map(item => overrides.get(item.id) ?? item)
  );

  function override(id: string, patch: T) {
    overrides.set(id, patch);
  }

  function clear(id: string) {
    overrides.delete(id);
  }

  return {
    get items() { return items; },
    override,
    clear,
  };
}
