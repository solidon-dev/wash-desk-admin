# wash-desk-admin 코드 컨벤션

> AI 에이전트 및 개발자가 새 라우트/기능을 작성할 때 반드시 이 문서를 먼저 읽고 따른다.
> 아래 패턴에서 벗어나는 코드는 작성하지 않는다.

---

## 0. 공통 모듈 맵 — 새 코드 작성 전 반드시 확인

> 아래 목록에 있는 것을 직접 재구현하거나 다른 경로에 새로 만들지 않는다.
> 모든 import는 `$lib`을 통해 한다.

### 컴포넌트 (`src/lib/components/`)

| 파일 | import | 용도 |
|------|--------|------|
| `ModalShell.svelte` | layout에 이미 마운트됨 — 직접 import 불필요 | 전역 모달 렌더러. `modal.open(snippet)`으로 제어 |
| `Pagination.svelte` | `import { Pagination } from '$lib'` | 페이지네이션 UI |
| `SearchBar.svelte` | `import { SearchBar } from '$lib'` | 자동완성 검색바 |
| `TableCard.svelte` | `import { TableCard } from '$lib'` | 카드 래퍼 레이아웃 |

### 유틸 (`src/lib/utils/`)

| 파일 | 주요 export | 용도 |
|------|-------------|------|
| `listStore.svelte.ts` | `createListStore(getItems)` | 서버 SSR 데이터 기반 낙관적 업데이트 헬퍼. `SvelteMap` overrides로 현재 페이지 아이템 패치 |
| `phone.ts` | `formatPhone`, `unformatPhone`, `displayPhone` | 전화번호 포맷/파싱 |

### 모달 스토어 (`src/lib/modal.svelte.ts`)

**모든 모달은 이 스토어를 통해 연다. `{#if showModal}` 로 직접 dialog를 렌더링하는 코드를 새로 작성하지 않는다.**

```ts
import { modal } from '$lib';

modal.open(mySnippet);  // snippet을 넘겨 열기
modal.close();          // 닫기
```

**snippet 패턴 (+page.svelte)**

```svelte
<script lang="ts">
  import { modal } from '$lib';
  let errorMessage = $state('');

  function showErrorModal(message?: string) {
    errorMessage = message ?? '업데이트에 실패했습니다. 같은 문제가 반복된다면 관리자에게 문의해 주세요.';
    modal.open(errorContent);
  }
</script>

{#snippet confirmModal()}
  <div class="modal-box max-w-sm">
    <h3 class="font-semibold">삭제하시겠습니까?</h3>
    <div class="modal-action">
      <button class="btn btn-sm btn-ghost" onclick={modal.close}>취소</button>
      <button class="btn btn-sm btn-error" onclick={handleDelete}>삭제</button>
    </div>
  </div>
{/snippet}

{#snippet errorContent()}
  <div class="modal-box max-w-sm">
    <div class="flex items-start gap-3">
      <Icon icon="lucide:alert-circle" class="text-error mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <h3 class="font-semibold">오류가 발생했습니다</h3>
        <p class="mt-1 text-sm text-base-content/70">{errorMessage}</p>
      </div>
    </div>
    <div class="modal-action mt-4">
      <button class="btn btn-sm" onclick={modal.close}>확인</button>
    </div>
  </div>
{/snippet}

<button onclick={() => modal.open(confirmModal)}>삭제</button>
```

**규칙:**
- 모달 내용은 `modal-box` div부터 작성한다 (`dialog`, `modal` 래퍼는 ModalShell이 담당)
- 닫기 버튼은 `onclick={modal.close}`
- Escape 키 / backdrop 클릭은 ModalShell이 자동 처리

### Supabase (`src/lib/supabase/`)

| 파일 | 용도 |
|------|------|
| `client.ts` | 브라우저용 클라이언트 싱글턴. `import { supabase } from '$lib/supabase/client'` |
| `server.ts` | SSR용 클라이언트 팩토리. hooks/server에서만 사용 |
| `database.types.ts` | Supabase CLI 자동생성 타입. **직접 import 금지** — `types.ts` 통해서 사용 |
| `types.ts` | 모든 테이블/RPC 타입 파사드. `import type { Item, Client, ... } from '$lib/supabase/types'` |

> ⚠️ `src/lib/types/supabase.ts`는 구버전 레거시 파일이다. import하지 않는다.

---

## 1. 데이터 로딩 전략

- **초기 데이터는 무조건 `+page.server.ts` `load`에서 SSR로 내려준다**
- `onMount`에서 초기 fetch 금지
- 파생값은 `$derived` / `$derived.by()`로 계산한다
- `$effect`는 진짜 사이드이펙트(DOM 조작, 외부 구독)에만 쓴다

```ts
// +page.server.ts
export const load: PageServerLoad = async ({ locals, url }) => {
  const { data, error } = await locals.supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { clients: [] };
  return { clients: data };
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
  let { data }: PageProps = $props();

  // ✅ createListStore로 낙관적 업데이트 처리 (페이지네이션 있을 때)
  const list = createListStore(() => data.clients);

  // ✅ 파생값은 $derived로
  const activeClients = $derived(list.items.filter(c => !c.deleted_at));
</script>
```

### $state 초기값에 data 직접 사용 금지

`$state` 초기값에 `data`를 넣으면 `state_referenced_locally` 경고가 발생한다.
반응형 컨텍스트 밖에서 읽히기 때문이다.

```ts
// ❌ 금지
let items = $state([...data.items]);

// ✅ $effect로 초기화 (createListStore가 없는 경우)
let items = $state<Item[]>([]);
$effect(() => { items = [...data.items]; });
```

---

## 2. 액션 처리 — submitAction 인라인 패턴

모든 server action 호출은 각 페이지에서 아래 패턴을 인라인으로 작성한다.
`use:enhance` 및 `form` prop을 통한 결과 처리는 사용하지 않는다.

**서버 액션은 반드시 수정된 row 전체를 반환한다** — 클라이언트가 서버 응답으로 로컬 상태를 교체하기 위해 필요하다.

```ts
// +page.server.ts
export const actions: Actions = {
  update: async ({ request, locals }) => {
    const myRole = locals.session?.role;
    if (!myRole || myRole === 'worker') return fail(403, { error: '권한이 없습니다.' });

    const form = await request.formData();
    const id   = form.get('id') as string;
    const name = (form.get('name') as string)?.trim();

    const { data: updated, error } = await locals.supabase
      .from('clients')
      .update({ name })
      .eq('id', id)
      .select('*')   // ← 반드시 수정된 row 반환
      .single();

    if (error) return fail(500, { error: error.message });
    return { success: true, client: updated };  // ← client 키로 반환
  },
};
```

```ts
// +page.svelte <script>
import { deserialize } from '$app/forms';

async function submitAction<T = unknown>(
  action: string,
  payload: Record<string, string>,
  onRollback?: () => void
): Promise<T | null> {
  const formData = new FormData();
  for (const [k, v] of Object.entries(payload)) formData.append(k, v);
  try {
    const res    = await fetch(`?/${action}`, { method: 'POST', body: formData });
    const result = deserialize(await res.text()) as { type: string; data?: { error?: string } & Record<string, T> };
    if (result.type === 'failure' || result.type === 'error') {
      onRollback?.();
      showErrorModal(result.data?.error);
      return null;
    }
    return (result.data as Record<string, T>)?.[responseKey] ?? null;
  } catch {
    onRollback?.();
    showErrorModal();
    return null;
  }
}
```

---

## 3. 낙관적 업데이트

### 원칙

| 액션 | 방식 | 이유 |
|------|------|------|
| update / hide / restore | `list.override()` — 클라이언트 즉시 반영 | id 알고 있음, 변경값 예측 가능 |
| create | `invalidateAll()` — 서버 재요청 | 서버가 id/created_at/정렬 결정, 예측 불가 |

### createListStore 사용 (페이지네이션 있는 목록)

```ts
import { createListStore } from '$lib';
import { invalidateAll } from '$app/navigation';

const list = createListStore(() => data.clients);
// 템플릿: {#each list.items as c}
```

**update / hide / restore 패턴**

```ts
async function handleUpdate() {
  const id   = editingClient.id;
  const prev = data.clients.find(c => c.id === id);

  // 1. 즉시 UI 반영 + 모달 닫기
  list.override(id, optimistic);
  modal.close();

  // 2. 백그라운드 저장
  const saved = await submitAction('update', payload, () => list.clear(id)); // 실패 → 롤백
  list.clear(id);
  if (saved) list.override(id, saved); // 서버 응답으로 정확한 값 교체
}
```

**create 패턴**

```ts
async function handleCreate() {
  modal.close();
  const ok = await submitAction('create', payload);
  if (ok) await invalidateAll(); // 서버에서 새 row 포함한 목록 재요청
}
```

### 페이지네이션 없는 목록 — 인라인 직접 작성

```ts
// update
const prev = items.find(i => i.id === id);
items = items.map(i => i.id === id ? { ...i, ...patch } : i);
const saved = await submitAction('update', payload, () => {
  items = items.map(i => i.id === id ? (prev ?? i) : i);
});
if (saved) items = items.map(i => i.id === id ? saved : i);

// delete
const prev = items.slice();
items = items.filter(i => i.id !== id);
const ok = await submitAction('delete', { id }, () => { items = prev; });
```

---

## 4. 에러 처리

**액션 실패는 에러 모달로 표시한다.** 각 페이지에 아래 패턴을 포함한다.

```svelte
<script lang="ts">
  let errorMessage = $state('');

  function showErrorModal(message?: string) {
    errorMessage = message ?? '업데이트에 실패했습니다. 같은 문제가 반복된다면 관리자에게 문의해 주세요.';
    modal.open(errorContent);
  }
</script>

{#snippet errorContent()}
  <div class="modal-box max-w-sm">
    <div class="flex items-start gap-3">
      <Icon icon="lucide:alert-circle" class="text-error mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <h3 class="font-semibold">오류가 발생했습니다</h3>
        <p class="mt-1 text-sm text-base-content/70">{errorMessage}</p>
      </div>
    </div>
    <div class="modal-action mt-4">
      <button class="btn btn-sm" onclick={modal.close}>확인</button>
    </div>
  </div>
{/snippet}
```

| 상황 | 메시지 |
|------|--------|
| 기본 | 업데이트에 실패했습니다. 같은 문제가 반복된다면 관리자에게 문의해 주세요. |
| 권한 오류 | 이 작업을 수행할 권한이 없습니다. |
| 중복 항목 | 이미 동일한 항목이 존재합니다. |
| 삭제 실패 | 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요. |

---

## 5. $effect 사용 기준

### 써도 되는 경우
- 페이지네이션 없는 목록에서 서버 데이터 변경 시 로컬 상태 동기화
- DOM 직접 조작 (포커스, 스크롤 등)
- 외부 구독/이벤트 리스너 등록/해제
- URL 파라미터 변경에 반응해서 로컬 UI 상태 초기화

### 쓰면 안 되는 경우
- 파생값 계산 → `$derived` 사용
- 초기 데이터 fetch → `+page.server.ts` `load` 사용
- `$state` → `$state` 계산 → `$derived` 사용

```ts
// ❌
let fullName = $state('');
$effect(() => { fullName = `${firstName} ${lastName}`; });

// ✅
const fullName = $derived(`${firstName} ${lastName}`);
```

---

## 6. 라우트 파일 구조 표준

```
src/routes/(app)/[route]/
├── +page.server.ts   — load(SSR) + actions
└── +page.svelte      — UI + createListStore + submitAction + modal snippets
```

### +page.server.ts 섹션 순서

```ts
// 1. load 함수 (SSR 데이터)
// 2. actions (권한 체크 → 입력 검증 → DB 작업 → row 반환)
```

### +page.svelte `<script>` 섹션 순서

```ts
// 1. import
// 2. $props()
// 3. 타입 정의
// 4. createListStore (페이지네이션 있는 경우)
// 5. $derived 파생값
// 6. UI $state (모달용 폼 필드, 선택값 등)
// 7. errorMessage $state + showErrorModal
// 8. submitAction 인라인 구현
// 9. 액션 핸들러 (handleCreate, handleUpdate, handleDelete 등)
// 10. 이벤트 핸들러 (navTo, onSearchInput 등)
```

---

## 7. Supabase 클라이언트 사용 규칙

- **서버** (`+page.server.ts`, hooks) → `locals.supabase`
- **클라이언트** (`+page.svelte`) → `$lib/supabase/client` (RLS로 보호되는 경우만)
- `service_role` 키는 절대 클라이언트 코드에 노출하지 않는다

---

## 8. 체크리스트 (새 라우트 작성 전 확인)

- [ ] 초기 데이터를 `+page.server.ts` `load`에서 SSR로 내려주고 있는가?
- [ ] `$state` 초기값에 `data`를 직접 넣고 있지 않은가?
- [ ] 파생값을 `$derived`로 계산하고 있는가?
- [ ] 목록은 `createListStore`를 사용하고 있는가?
- [ ] server action이 수정된 row를 반환하고 있는가?
- [ ] update/hide/restore는 `list.override()`로 즉시 반영하고 있는가?
- [ ] create는 `invalidateAll()`로 서버 재요청하고 있는가?
- [ ] 액션 실패 시 에러 모달 + 롤백이 되는가?
- [ ] `use:enhance` / `form` prop 방식을 사용하고 있지 않은가?
- [ ] role/session 검증이 필요한 액션은 server action을 사용하고 있는가?
