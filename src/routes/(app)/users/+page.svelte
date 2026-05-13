<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import Icon from '@iconify/svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import TableCard from '$lib/components/TableCard.svelte';
  import { supabase } from '$lib/supabase/client';
  import type { PageData } from './$types';

  type Props = {
    data: PageData & { users: UserRow[]; factories: { id: string; name: string }[] };
    form: { success?: boolean; error?: string } | null;
  };
  let { data, form }: Props = $props();

  type UserRole = 'super_admin' | 'factory_admin' | 'worker';

  type UserRow = {
    id: string;
    full_name: string | null;
    username: string;
    phone: string | null;
    role: string;
    factory_id: string | null;
    factory_name: string | null;
    created_at: string;
    deleted_at: string | null;
  };

  const roleLabel: Record<UserRole, string> = {
    super_admin:   '최고관리자',
    factory_admin: '공장관리자',
    worker:        '실무자',
  };
  const roleBadge: Record<UserRole, string> = {
    super_admin:   'badge-warning',
    factory_admin: 'badge-primary',
    worker:        'badge-ghost',
  };

  let users      = $state<UserRow[]>(data.users);
  const factories = $derived(data.factories);

  // 서버 액션 성공 시 데이터 갱신
  $effect(() => {
    if (form?.success) {
      invalidateAll().then(() => {
        users = data.users;
        closeModal();
        deactivateTargetId = null;
      });
    }
  });

  // ── 검색 / 필터 ──
  let selectedId  = $state('');
  let showDeleted = $state(false);

  const searchItems = $derived(
    users
      .filter(u => u.deleted_at === null)
      .map(u => ({ id: u.id, label: u.full_name ?? u.username, sub: u.username }))
  );

  const PAGE_SIZE = 10;
  let currentPage = $state(1);

  const filteredUsers = $derived(
    users.filter(u => {
      if (u.role === 'super_admin') return false;  // 최고관리자는 목록에서 제외
      if (!showDeleted && u.deleted_at !== null) return false;
      if (selectedId) return u.id === selectedId;
      return true;
    })
  );

  $effect(() => { void selectedId; void showDeleted; currentPage = 1; });

  const totalPages   = $derived(Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE)));
  const visibleUsers = $derived(filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

  function formatDate(iso: string) { return iso.slice(0, 10); }

  // ── 등록/수정 모달 ──
  let showModal        = $state(false);
  let editingUser      = $state<UserRow | null>(null);
  let formName         = $state('');
  let formUsername     = $state('');
  let formPassword     = $state('');
  let formPasswordConf = $state('');
  let formRole         = $state<UserRole>('worker');
  let formFactoryId    = $state('');
  let formPhone        = $state('');
  let showPassword     = $state(false);
  let showPasswordConf = $state(false);
  let saving           = $state(false);
  let saveError        = $state('');

  const passwordMismatch = $derived(
    formPasswordConf.length > 0 && formPassword !== formPasswordConf
  );

  function openAdd() {
    editingUser      = null;
    formName         = '';
    formUsername     = '';
    formPassword     = '';
    formPasswordConf = '';
    formRole         = 'worker';
    formFactoryId    = factories[0]?.id ?? '';
    formPhone        = '';
    showPassword     = false;
    showPasswordConf = false;
    saveError        = '';
    showModal        = true;
  }

  function openEdit(u: UserRow) {
    editingUser      = u;
    formName         = u.full_name ?? '';
    formUsername     = u.username;
    formPassword     = '';
    formPasswordConf = '';
    formRole         = (u.role as UserRole) ?? 'worker';
    formFactoryId    = u.factory_id ?? '';
    formPhone        = u.phone ?? '';
    showPassword     = false;
    showPasswordConf = false;
    saveError        = '';
    showModal        = true;
  }

  function closeModal() {
    showModal   = false;
    saveError   = '';
  }

  // 수정은 클라이언트에서 직접 supabase update
  async function handleUpdate() {
    if (!editingUser) return;
    saving    = true;
    saveError = '';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name:  formName.trim(),
          role:       formRole,
          factory_id: formFactoryId || null,
          phone:      formPhone.trim() || null,
        })
        .eq('id', editingUser.id);

      if (error) { saveError = error.message; return; }

      // 로컬 상태 즉시 갱신
      const idx = users.findIndex(u => u.id === editingUser!.id);
      if (idx !== -1) {
        users[idx] = {
          ...users[idx],
          full_name:    formName.trim(),
          role:         formRole,
          factory_id:   formFactoryId || null,
          factory_name: factories.find(f => f.id === formFactoryId)?.name ?? null,
          phone:        formPhone.trim() || null,
        };
      }
      closeModal();
    } finally {
      saving = false;
    }
  }

  // ── 비활성화 확인 모달 ──
  let deactivateTargetId = $state<string | null>(null);
  function openDeactivate(id: string) { deactivateTargetId = id; }
  function cancelDeactivate() { deactivateTargetId = null; }
</script>

<!-- ───────────────────────────── 메인 컨텐츠 ───────────────────────────── -->
<div class="min-h-full bg-base-200 px-8 py-10">
  <h2 class="text-2xl font-extrabold text-base-content mb-5">사용자 관리</h2>

  <div class="flex flex-wrap items-center gap-3 mb-5">
    <SearchBar
      placeholder="이름, 아이디 검색..."
      items={searchItems}
      onselect={(id) => (selectedId = id)}
      class="w-64 sm:w-72"
    />
    <label class="flex items-center gap-2 cursor-pointer select-none text-sm text-base-content/60 font-semibold">
      <input type="checkbox" bind:checked={showDeleted} class="checkbox checkbox-sm" />
      비활성 포함
    </label>
    <button onclick={openAdd} class="btn btn-primary btn-sm gap-2 whitespace-nowrap ml-auto sm:w-auto w-full">
      <Icon icon="lucide:plus" class="w-4 h-4" />
      사용자 등록
    </button>
  </div>

  {#if form?.error}
    <div class="alert alert-error mb-4 gap-2 text-sm font-semibold">
      <Icon icon="lucide:circle-alert" class="h-4 w-4 shrink-0" />
      <span>{form.error}</span>
    </div>
  {/if}

  <TableCard>
    <table class="table table-sm w-full">
      <thead class="bg-base-200 text-base-content/60">
        <tr>
          <th class="text-xs font-bold">이름</th>
          <th class="text-xs font-bold hidden lg:table-cell">역할</th>
          <th class="text-xs font-bold hidden lg:table-cell">아이디</th>
          <th class="text-xs font-bold hidden lg:table-cell">소속 공장</th>
          <th class="text-xs font-bold hidden lg:table-cell">연락처</th>
          <th class="text-xs font-bold hidden lg:table-cell whitespace-nowrap">등록일</th>
          <th class="text-xs font-bold text-center whitespace-nowrap">액션</th>
        </tr>
      </thead>
      <tbody>
        {#if filteredUsers.length === 0}
          <tr>
            <td colspan="7" class="py-16 text-center text-base-content/40 text-sm">
              등록된 사용자가 없습니다.
            </td>
          </tr>
        {:else}
          {#each visibleUsers as user (user.id)}
            {@const isDeleted = user.deleted_at !== null}
            {@const role = user.role as UserRole}
            <tr class="hover:bg-base-200 transition-colors {isDeleted ? 'opacity-40' : ''}">
              <td class="font-semibold text-base-content">
                <span>{user.full_name ?? '—'}</span>
                {#if isDeleted}
                  <span class="badge badge-ghost badge-xs ml-1">비활성</span>
                {/if}
                <div class="lg:hidden mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span class="badge badge-xs font-bold {roleBadge[role] ?? 'badge-ghost'}">{roleLabel[role] ?? role}</span>
                  <span class="text-xs text-base-content/50 font-mono">{user.username}</span>
                  {#if user.factory_name}<span class="text-xs text-base-content/40">{user.factory_name}</span>{/if}
                  {#if user.phone}<span class="text-xs text-base-content/40">{user.phone}</span>{/if}
                  <span class="text-xs text-base-content/30">{formatDate(user.created_at)}</span>
                </div>
              </td>
              <td class="hidden lg:table-cell">
                <span class="badge badge-sm font-bold {roleBadge[role] ?? 'badge-ghost'}">{roleLabel[role] ?? role}</span>
              </td>
              <td class="text-base-content/70 text-sm font-mono hidden lg:table-cell">{user.username}</td>
              <td class="text-base-content/70 text-sm hidden lg:table-cell">{user.factory_name ?? '—'}</td>
              <td class="text-base-content/70 text-sm hidden lg:table-cell">{user.phone ?? '—'}</td>
              <td class="text-base-content/50 text-xs whitespace-nowrap hidden lg:table-cell">{formatDate(user.created_at)}</td>
              <td class="text-center">
                <button onclick={() => openEdit(user)} class="btn btn-ghost btn-xs text-primary font-semibold">수정</button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </TableCard>

  <div class="mt-4">
    <Pagination {currentPage} {totalPages} totalItems={filteredUsers.length} pageSize={PAGE_SIZE} onpage={(p) => (currentPage = p)} />
  </div>
</div>

<!-- ───────────────────────── 등록 모달 (서버 액션) ───────────────────────── -->
{#if showModal && !editingUser}
  <dialog class="modal modal-open" onmousedown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
    <div class="modal-box w-full max-w-lg rounded-2xl p-6 flex flex-col" style="max-height: 620px;">
      <div class="flex items-center justify-between mb-5 shrink-0">
        <h3 class="text-lg font-extrabold text-base-content">사용자 등록</h3>
        <button onclick={closeModal} class="btn btn-ghost btn-sm btn-circle"><Icon icon="lucide:x" class="w-5 h-5" /></button>
      </div>

      <form
        method="POST"
        action="?/create"
        use:enhance={({ cancel }) => {
          saveError = '';
          if (formPassword !== formPasswordConf) {
            saveError = '비밀번호가 일치하지 않습니다.';
            cancel();
            return;
          }
          return async ({ result, update }) => {
            if (result.type === 'failure') {
              saveError = (result.data as { error?: string })?.error ?? '오류가 발생했습니다.';
            }
            await update();
          };
        }}
        class="flex flex-col flex-1 overflow-hidden"
      >
        <div class="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
          <!-- 이름 + 아이디 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="cName" class="label pb-1"><span class="label-text text-xs font-bold text-base-content/60">이름 *</span></label>
              <input id="cName" name="full_name" type="text" bind:value={formName} placeholder="홍길동" class="input input-bordered w-full text-sm" required />
            </div>
            <div>
              <label for="cUsername" class="label pb-1"><span class="label-text text-xs font-bold text-base-content/60">아이디 *</span></label>
              <input id="cUsername" name="username" type="text" bind:value={formUsername} placeholder="user_id" class="input input-bordered w-full text-sm" required />
            </div>
          </div>
          <!-- 비밀번호 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="cPw" class="label pb-1"><span class="label-text text-xs font-bold text-base-content/60">비밀번호 *</span></label>
              <div class="relative">
                <input id="cPw" name="password" type={showPassword ? 'text' : 'password'} bind:value={formPassword} placeholder="비밀번호 입력" class="input input-bordered w-full text-sm pr-9" required />
                <button type="button" onclick={() => (showPassword = !showPassword)} class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70">
                  <Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label for="cPwConf" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">비밀번호 확인 *{#if passwordMismatch}<span class="text-error ml-1">불일치</span>{/if}</span>
              </label>
              <div class="relative">
                <input id="cPwConf" type={showPasswordConf ? 'text' : 'password'} bind:value={formPasswordConf} placeholder="다시 입력" class="input input-bordered w-full text-sm pr-9 {passwordMismatch ? 'input-error' : ''}" required />
                <button type="button" onclick={() => (showPasswordConf = !showPasswordConf)} class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70">
                  <Icon icon={showPasswordConf ? 'lucide:eye-off' : 'lucide:eye'} class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <!-- 역할 + 공장 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="label-text text-xs font-bold text-base-content/60 mb-2">역할 *</p>
              <div class="flex gap-1.5">
                {#each (['factory_admin', 'worker'] as UserRole[]) as r (r)}
                  <button type="button" onclick={() => (formRole = r)} class="btn btn-sm font-bold flex-1 {formRole === r ? 'btn-primary' : 'btn-outline btn-ghost'}">{roleLabel[r]}</button>
                {/each}
              </div>
              <input type="hidden" name="role" value={formRole} />
            </div>
            <div>
              <label for="cFactory" class="label pb-1"><span class="label-text text-xs font-bold text-base-content/60">소속 공장 *</span></label>
              <select id="cFactory" name="factory_id" bind:value={formFactoryId} class="select select-bordered w-full text-sm" required>
                <option value="">공장 선택</option>
                {#each factories as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
              </select>
            </div>
          </div>
          <!-- 연락처 -->
          <div>
            <label for="cPhone" class="label pb-1"><span class="label-text text-xs font-bold text-base-content/60">연락처 <span class="text-base-content/30 font-normal">(선택)</span></span></label>
            <input id="cPhone" name="phone" type="text" bind:value={formPhone} placeholder="01012341234" maxlength="11" class="input input-bordered w-full text-sm" />
          </div>
          {#if saveError}
            <div class="alert alert-error gap-2 rounded-xl py-3 px-4 text-sm font-semibold">
              <Icon icon="lucide:circle-alert" class="h-4 w-4 shrink-0" /><span>{saveError}</span>
            </div>
          {/if}
        </div>
        <div class="modal-action mt-5 pt-4 border-t border-base-200 shrink-0">
          <button type="button" onclick={closeModal} class="btn btn-ghost font-bold">취소</button>
          <button type="submit" disabled={passwordMismatch} class="btn btn-primary font-bold disabled:opacity-50">등록</button>
        </div>
      </form>
    </div>
  </dialog>
{/if}

<!-- ───────────────────────── 수정 모달 (클라이언트 supabase) ──────────────── -->
{#if showModal && editingUser}
  <dialog class="modal modal-open" onmousedown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
    <div class="modal-box w-full max-w-lg rounded-2xl p-6 flex flex-col" style="max-height: 620px;">
      <div class="flex items-center justify-between mb-5 shrink-0">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-extrabold text-base-content">사용자 수정</h3>
          {#if editingUser?.deleted_at !== null}
            <form method="POST" action="?/activate" use:enhance>
              <input type="hidden" name="id" value={editingUser?.id} />
              <button type="submit" class="btn btn-xs btn-success font-bold">활성화</button>
            </form>
          {:else}
            <button onclick={() => { closeModal(); openDeactivate(editingUser!.id); }} class="btn btn-xs btn-outline btn-warning font-bold">비활성화</button>
          {/if}
        </div>
        <button onclick={closeModal} class="btn btn-ghost btn-sm btn-circle"><Icon icon="lucide:x" class="w-5 h-5" /></button>
      </div>

      <div class="flex flex-col flex-1 overflow-hidden">
        <div class="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
          <!-- 이름 + 아이디 (아이디 비활성) -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="eName" class="label pb-1"><span class="label-text text-xs font-bold text-base-content/60">이름 *</span></label>
              <input id="eName" type="text" bind:value={formName} placeholder="홍길동" class="input input-bordered w-full text-sm" required />
            </div>
            <div>
              <label for="eUsername" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">아이디 <span class="text-base-content/30 font-normal">(변경 불가)</span></span>
              </label>
              <input id="eUsername" type="text" value={formUsername} class="input input-bordered w-full text-sm opacity-50" disabled />
            </div>
          </div>
          <!-- 역할 + 공장 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="label-text text-xs font-bold text-base-content/60 mb-2">역할 *</p>
              <div class="flex gap-1.5">
                {#each (['factory_admin', 'worker'] as UserRole[]) as r (r)}
                  <button type="button" onclick={() => (formRole = r)} class="btn btn-xs font-bold flex-1 {formRole === r ? 'btn-primary' : 'btn-outline btn-ghost'}">{roleLabel[r]}</button>
                {/each}
              </div>
            </div>
            <div>
              <label for="eFactory" class="label pb-1"><span class="label-text text-xs font-bold text-base-content/60">소속 공장 *</span></label>
              <select id="eFactory" bind:value={formFactoryId} class="select select-bordered w-full text-sm">
                <option value="">공장 선택</option>
                {#each factories as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
              </select>
            </div>
          </div>
          <!-- 연락처 -->
          <div>
            <label for="ePhone" class="label pb-1"><span class="label-text text-xs font-bold text-base-content/60">연락처</span></label>
            <input id="ePhone" type="text" bind:value={formPhone} placeholder="010-0000-0000" class="input input-bordered w-full text-sm" />
          </div>
          <!-- 비밀번호 변경 (서버 액션 별도 폼) -->
          <div class="border border-base-300 rounded-xl p-4 flex flex-col gap-3">
            <p class="text-xs font-bold text-base-content/50 uppercase tracking-wider">비밀번호 변경</p>
            <div class="grid grid-cols-2 gap-4">
              <div class="relative">
                <input type={showPassword ? 'text' : 'password'} bind:value={formPassword} placeholder="새 비밀번호" class="input input-bordered w-full text-sm pr-9" />
                <button type="button" onclick={() => (showPassword = !showPassword)} class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70">
                  <Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} class="w-4 h-4" />
                </button>
              </div>
              <div class="relative">
                <input type={showPasswordConf ? 'text' : 'password'} bind:value={formPasswordConf} placeholder="다시 입력" class="input input-bordered w-full text-sm pr-9 {passwordMismatch ? 'input-error' : ''}" />
                <button type="button" onclick={() => (showPasswordConf = !showPasswordConf)} class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70">
                  <Icon icon={showPasswordConf ? 'lucide:eye-off' : 'lucide:eye'} class="w-4 h-4" />
                </button>
              </div>
            </div>
            {#if formPassword}
              <form
                method="POST"
                action="?/setPassword"
                use:enhance={({ cancel }) => {
                  if (!formPassword || passwordMismatch) { cancel(); return; }
                  return async ({ result, update }) => {
                    if (result.type === 'failure') {
                      saveError = (result.data as { error?: string })?.error ?? '비밀번호 변경 실패';
                    }
                    await update();
                  };
                }}
              >
                <input type="hidden" name="id" value={editingUser.id} />
                <input type="hidden" name="password" value={formPassword} />
                <button type="submit" disabled={passwordMismatch || !formPassword} class="btn btn-sm btn-outline btn-primary font-bold disabled:opacity-50">
                  비밀번호 변경
                </button>
              </form>
            {/if}
          </div>
          {#if saveError}
            <div class="alert alert-error gap-2 rounded-xl py-3 px-4 text-sm font-semibold">
              <Icon icon="lucide:circle-alert" class="h-4 w-4 shrink-0" /><span>{saveError}</span>
            </div>
          {/if}
        </div>
        <div class="modal-action mt-5 pt-4 border-t border-base-200 shrink-0">
          <button type="button" onclick={closeModal} class="btn btn-ghost font-bold">취소</button>
          <button type="button" onclick={handleUpdate} disabled={saving} class="btn btn-primary font-bold disabled:opacity-50">
            {#if saving}<span class="loading loading-spinner loading-xs"></span>{/if}
            저장
          </button>
        </div>
      </div>
    </div>
  </dialog>
{/if}

<!-- ───────────────────────────── 비활성화 확인 모달 ───────────────────────────── -->
{#if deactivateTargetId}
  {@const target = users.find(u => u.id === deactivateTargetId)}
  <dialog class="modal modal-open" onmousedown={(e) => { if (e.target === e.currentTarget) cancelDeactivate(); }}>
    <div class="modal-box w-full max-w-sm rounded-2xl p-6">
      <h3 class="text-base font-extrabold text-base-content mb-2">사용자 비활성화</h3>
      <p class="text-sm text-base-content/70 mb-6">
        <span class="font-bold text-warning">{target?.full_name ?? target?.username}</span> 계정을 비활성화하시겠습니까?<br />
        <span class="text-xs text-base-content/40">로그인이 차단되며 언제든 다시 활성화할 수 있습니다.</span>
      </p>
      <form method="POST" action="?/deactivate" use:enhance class="flex gap-2 justify-end">
        <input type="hidden" name="id" value={deactivateTargetId} />
        <button type="button" onclick={cancelDeactivate} class="btn btn-ghost font-bold">취소</button>
        <button type="submit" class="btn btn-warning font-bold">비활성화</button>
      </form>
    </div>
  </dialog>
{/if}
