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
| `action.ts` | `submitAction(action, payload, options)` | server action 호출 공통 헬퍼. fetch + deserialize + 에러처리 + 롤백 + revalidate 옵션 포함 |
| `action.ts` | `friendlyError(raw?)` | 서버 에러 메시지 → 사용자 친화적 한국어 변환 |
| `phone.ts` | `formatPhone`, `unformatPhone`, `displayPhone` | 전화번호 포맷/파싱 |

### 모달 스토어 (`src/lib/modal.svelte.ts`)

**모든 모달은 이 스토어를 통해 연다. `{#if}` 로 직접 `modal modal-open` 다이얼로그를 렌더링하는 코드를 새로 작성하지 않는다.**

```ts
import { modal } from '$lib';

// 모달 열기
modal.open(mySnippet);   // snippet 변수를 넘김

// 모달 닫기
modal.close();
```

**호출부 패턴 (+page.svelte)**

```svelte
<script lang="ts">
  import { modal } from '$lib';

  let errorMessage = $state('');
</script>

<!-- 확인 모달 -->
{#snippet confirmDelete()}
  <div class="modal-box max-w-sm">
    <h3 class="font-semibold">삭제하시겠습니까?</h3>
    <div class="modal-action">
      <button class="btn btn-sm btn-ghost" onclick={modal.close}>취소</button>
      <button class="btn btn-sm btn-error" onclick={handleDelete}>삭제</button>
    </div>
  </div>
{/snippet}

<!-- 에러 모달 -->
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

<!-- 에러 시: -->
<!-- errorMessage = '...'; modal.open(errorContent); -->

<button onclick={() => modal.open(confirmDelete)}>삭제</button>
```

**규칙:**
- 모달 내용은 `modal-box` div부터 작성한다 (`dialog`, `modal` 래퍼는 ModalShell이 담당)
- 모달 닫기 버튼은 `onclick={modal.close}`
- Escape 키 / backdrop 클릭은 ModalShell이 자동 처리

### Supabase (`src/lib/supabase/`)

| 파일 | 용도 |
|------|------|
| `client.ts` | 브라우저용 클라이언트 싱글턴. `import { supabase } from '$lib/supabase/client'` |
| `server.ts` | SSR용 클라이언트 팩토리. hooks/server에서만 사용 |
| `database.types.ts` | Supabase CLI 자동생성 타입. **직접 import 금지** — `types.ts` 통해서 사용 |
| `types.ts` | 모든 테이블/RPC 타입 파사드. `import type { Item, Client, ... } from '$lib/supabase/types'` |

> ⚠️ `src/lib/types/supabase.ts`는 구버전 레거시 파일이다. import하지 않는다.

### 낙관적 업데이트

별도 헬퍼 없음 — **인라인으로 3줄로 직접 작성한다** (추상화 불필요):

```ts
// 수정
const prev = items.slice();
items = items.map(i => i.id === id ? { ...i, ...patch } : i);
// 실패 시: items = prev;

// 삭제
const prev = items.slice();
items = items.filter(i => i.id !== id);
// 실패 시: items = prev;

// 추가 (tmpId 패턴)
const tmpId = `tmp-${Date.now()}`;
items = [...items, { id: tmpId, ...newItem }];
// 실패 시: items = items.filter(i => i.id !== tmpId);
// 성공 시: invalidateAll() 호출로 서버 데이터 재수신
```

---

## 1. 데이터 로딩 전략

### 원칙
- **초기 데이터는 무조건 `+page.server.ts`의 `load` 함수에서 SSR로 내려준다**
- `onMount` 안에서 fetch로 초기 데이터를 가져오는 코드는 절대 작성하지 않는다
- 클라이언트에서 파생되는 모든 값은 `$derived` 또는 `$derived.by()`로 계산한다
- `$effect`는 진짜 사이드이펙트(DOM 조작, 외부 구독 등)에만 쓴다 — 파생 상태 계산에 쓰지 않는다

### 올바른 패턴

```ts
// +page.server.ts
export const load: PageServerLoad = async ({ locals, url }) => {
  const clientId = url.searchParams.get('clientId');

  const { data, error } = await locals.supabase
    .from('items')
    .select('id, name_ko, sort_order')
    .eq('client_id', clientId);

  if (error) return { items: [] };
  return { items: data };
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
  let { data }: PageProps = $props();

  // ✅ 서버 데이터를 로컬 상태로 복사 (낙관적 업데이트용)
  let localItems = $state([...data.items]);

  // ✅ 서버 데이터가 revalidate되면 로컬도 동기화
  const serverItems = $derived(data.items);
  $effect(() => { localItems = [...serverItems]; });

  // ✅ 파생값은 $derived로
  const sortedItems = $derived(localItems.toSorted((a, b) => a.sort_order - b.sort_order));
</script>
```

### 금지 패턴

```svelte
<!-- ❌ onMount에서 초기 데이터 fetch — 절대 사용 금지 -->
<script lang="ts">
  let items = $state([]);
  onMount(async () => {
    const res = await fetch('/api/items');
    items = await res.json();
  });
</script>

<!-- ❌ $effect로 파생 상태 계산 — 절대 사용 금지 -->
<script lang="ts">
  let sortedItems = $state([]);
  $effect(() => {
    sortedItems = items.toSorted(...); // $derived 써야 함
  });
</script>
```

---

## 2. 액션 처리 전략

액션은 두 가지 경우로 나뉜다.

### 2-A. 민감한 정보가 포함된 액션 → `+page.server.ts` actions 사용

`role`, `factory_id`, `session` 등 서버에서만 검증해야 하는 정보가 필요한 경우.

```ts
// +page.server.ts
export const actions: Actions = {
  updateItem: async ({ request, locals }) => {
    const myRole = locals.session?.role;
    if (!myRole || myRole === 'worker') return fail(403, { error: '권한이 없습니다.' });

    const form = await request.formData();
    const id   = form.get('id') as string;
    const name = (form.get('name') as string)?.trim();

    const { error } = await locals.supabase
      .from('items').update({ name }).eq('id', id);

    if (error) return fail(500, { error: error.message });
    return { success: true };
  },
};
```

클라이언트에서 호출할 때는 `fetch` + `deserialize` 패턴을 사용한다:

```ts
// +page.svelte <script>
import { deserialize } from '$app/forms';

async function submitAction(
  action: string,
  payload: Record<string, string>,
  onRollback?: () => void
): Promise<boolean> {
  const form = new FormData();
  for (const [k, v] of Object.entries(payload)) form.append(k, v);

  try {
    const res    = await fetch(`?/${action}`, { method: 'POST', body: form });
    const result = deserialize(await res.text());

    if (result.type === 'failure' || result.type === 'error') {
      onRollback?.();
      const msg = (result as { data?: { error?: string } }).data?.error;
      showErrorModal(msg);
      return false;
    }
    return true;
  } catch {
    onRollback?.();
    showErrorModal();
    return false;
  }
}
```

### 2-B. 권한 검증이 필요 없는 액션 → 클라이언트에서 직접 Supabase 호출

role/session 검증이 불필요한 단순 CRUD는 클라이언트 supabase 클라이언트로 직접 처리한다.
(RLS 정책으로 DB 레벨에서 이미 보호되고 있는 경우)

```ts
import { supabase } from '$lib/supabase/client';

async function updateDisplayName(id: string, name: string, onRollback: () => void) {
  const { error } = await supabase
    .from('items').update({ name_ko: name }).eq('id', id);

  if (error) {
    onRollback();
    showErrorModal(error.message);
  }
}
```

---

## 3. 낙관적 업데이트 (Optimistic Update)

**모든 mutation은 낙관적 업데이트를 기본으로 한다.**

### 패턴: 즉시 UI 반영 → 백그라운드 저장 → 실패 시 롤백

```ts
function updateItemName(item: Item, newName: string) {
  // 1. 이전 값 저장
  const prev = item.name_ko;

  // 2. 즉시 로컬 상태 반영
  localItems = localItems.map(i => i.id === item.id ? { ...i, name_ko: newName } : i);

  // 3. 백그라운드로 서버에 저장
  submitAction('updateItem', { id: item.id, name: newName }, () => {
    // 4. 실패 시 롤백
    localItems = localItems.map(i => i.id === item.id ? { ...i, name_ko: prev } : i);
  });
}
```

### 신규 항목 추가 시: tmpId 패턴

```ts
async function addItem(name: string) {
  const tmpId = `tmp-${Date.now()}`;

  // 즉시 추가
  localItems = [...localItems, { id: tmpId, name_ko: name, sort_order: 999 }];

  // 서버 저장
  const ok = await submitAction('createItem', { name }, () => {
    // 실패 시 tmpId 항목 제거
    localItems = localItems.filter(i => i.id !== tmpId);
  });

  if (ok) {
    // 성공 시 실제 데이터로 교체 (invalidateAll로 서버 데이터 재수신)
    await invalidateAll();
  }
}
```

### $effect로 서버 데이터를 로컬에 동기화할 때 낙관적 업데이트 보호

```ts
// 낙관적 업데이트 진행 중에는 $effect가 덮어쓰지 않도록 플래그 사용
let _suppress = false;
const serverItems = $derived(data.items);

$effect(() => {
  if (!_suppress) localItems = [...serverItems];
});

async function addItem(name: string) {
  const tmpId = `tmp-${Date.now()}`;
  _suppress = true;                          // $effect 동기화 잠시 억제
  localItems = [...localItems, { id: tmpId, name_ko: name }];

  const ok = await submitAction('createItem', { name }, () => {
    localItems = localItems.filter(i => i.id !== tmpId);
  });

  _suppress = false;
  if (ok) await invalidateAll();             // 서버 데이터 갱신 후 $effect가 다시 동기화
}
```

---

## 4. 에러 처리 — 공통 에러 모달

**액션 실패는 toast가 아닌 에러 모달로 표시한다.**
사용자가 명확히 인지하고 닫아야 하기 때문이다.

### 에러 모달 구현 (각 +page.svelte에 포함)

```svelte
<script lang="ts">
  let errorModal = $state<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  function showErrorModal(message?: string) {
    errorModal = {
      open: true,
      message: message ?? '업데이트에 실패했습니다. 같은 문제가 반복된다면 관리자에게 문의해 주세요.',
    };
  }

  function closeErrorModal() {
    errorModal = { ...errorModal, open: false };
  }
</script>

<!-- 에러 모달 -->
{#if errorModal.open}
  <dialog class="modal modal-open">
    <div class="modal-box max-w-sm">
      <div class="flex items-start gap-3">
        <Icon icon="lucide:alert-circle" class="text-error mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h3 class="font-semibold text-base-content">오류가 발생했습니다</h3>
          <p class="mt-1 text-sm text-base-content/70">{errorModal.message}</p>
        </div>
      </div>
      <div class="modal-action mt-4">
        <button class="btn btn-sm" onclick={closeErrorModal}>확인</button>
      </div>
    </div>
    <div class="modal-backdrop" role="button" tabindex="-1"
         onclick={closeErrorModal} onkeydown={() => {}}></div>
  </dialog>
{/if}
```

### 에러 메시지 작성 기준

| 상황 | 메시지 예시 |
|------|-------------|
| 기본 (원인 불명) | 업데이트에 실패했습니다. 같은 문제가 반복된다면 관리자에게 문의해 주세요. |
| 권한 오류 | 이 작업을 수행할 권한이 없습니다. |
| 중복 항목 | 이미 동일한 항목이 존재합니다. |
| 네트워크 오류 | 네트워크 연결을 확인하고 다시 시도해 주세요. |
| 삭제 실패 | 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요. |

---

## 5. $effect 사용 기준

### 써도 되는 경우
- 서버 데이터(`$derived`)가 바뀌면 로컬 상태(`$state`)를 동기화할 때
- DOM 직접 조작이 필요할 때 (포커스, 스크롤 등)
- 외부 구독/이벤트 리스너 등록/해제 (cleanup 반환)
- URL 파라미터 변경에 반응해서 로컬 UI 상태를 초기화할 때

### 쓰면 안 되는 경우
- 파생 값 계산 → `$derived` 사용
- 초기 데이터 fetch → `+page.server.ts` `load` 사용
- 다른 `$state`를 계산해서 또 다른 `$state`에 넣는 것 → `$derived` 사용

```ts
// ❌ 잘못된 패턴
let fullName = $state('');
$effect(() => { fullName = `${firstName} ${lastName}`; });

// ✅ 올바른 패턴
const fullName = $derived(`${firstName} ${lastName}`);
```

---

## 6. 라우트 파일 구조 표준

```
src/routes/(app)/[route]/
├── +page.server.ts   — load(SSR) + actions(민감한 서버 액션)
└── +page.svelte      — UI + 로컬 상태 + 낙관적 업데이트 + 에러 모달
```

### +page.server.ts 섹션 순서

```ts
// 1. 권한 헬퍼 함수
// 2. load 함수
// 3. actions (각 액션은 권한 체크 → 입력 검증 → DB 작업 순서)
```

### +page.svelte `<script>` 섹션 순서

```ts
// 1. import
// 2. $props()
// 3. 타입 정의
// 4. 서버 데이터 $derived 래핑
// 5. 로컬 상태 $state (낙관적 업데이트용)
// 6. $effect (서버 → 로컬 동기화)
// 7. 에러 모달 상태 + showErrorModal / closeErrorModal
// 8. UI 상태 $state (모달 open 여부, 선택값 등)
// 9. $derived 파생값
// 10. 액션 함수 (submitAction, 낙관적 업데이트 로직)
// 11. 이벤트 핸들러
```

---

## 7. 구조 변경 vs 단순 값 변경 구분

| 종류 | 예시 | 방법 |
|------|------|------|
| **단순 값 변경** | 이름 수정, 단가 변경, 날짜 변경 | 낙관적 업데이트 + `submitAction` (백그라운드) |
| **구조 변경** | 항목 추가, 삭제, 순서 변경 | tmpId 낙관적 추가 → 서버 저장 → `invalidateAll()` |

구조 변경은 서버의 실제 ID, sort_order 등을 받아야 하므로 `invalidateAll()`로 서버 데이터를 재수신한다.

---

## 8. Supabase 클라이언트 사용 규칙

- **서버 (`+page.server.ts`, hooks)** → `locals.supabase` (서버 클라이언트, RLS + session 적용)
- **클라이언트 (`+page.svelte`)** → `$lib/supabase/client`의 브라우저 클라이언트
- `service_role` 키는 절대 클라이언트 코드에 노출하지 않는다

---

## 9. 체크리스트 (새 라우트 작성 전 확인)

- [ ] 초기 데이터를 `+page.server.ts` `load`에서 내려주고 있는가?
- [ ] `onMount`에서 초기 fetch를 하고 있지 않은가?
- [ ] 파생값을 `$derived`로 계산하고 있는가? (`$effect` 미사용)
- [ ] 모든 mutation에 낙관적 업데이트가 적용되어 있는가?
- [ ] 액션 실패 시 에러 모달이 뜨고 롤백이 되는가?
- [ ] 에러 메시지가 일반 사용자가 이해할 수 있는 표현인가?
- [ ] `console.error`로만 에러를 처리하는 코드가 없는가?
- [ ] role/session 검증이 필요한 액션은 server action을 사용하고 있는가?
