<script lang="ts">
  import Icon from '@iconify/svelte';

  interface AdminUser {
    id: string;
    username: string;
    passwordHash: string;
    role: 'admin' | 'manager';
    name: string;
    email?: string;
    phone?: string;
    createdAt: string;
    isActive: boolean;
  }

  let adminUsers = $state<AdminUser[]>([
    { id: 'user-001', username: 'admin',    passwordHash: 'admin1234', role: 'admin',   name: '관리자',   email: 'admin@laundry.com', phone: '010-0000-0001', createdAt: '2024-01-01', isActive: true  },
    { id: 'user-002', username: 'manager1', passwordHash: 'pass1234',  role: 'manager', name: '김매니저', email: 'kim@laundry.com',   phone: '010-1111-2222', createdAt: '2024-02-01', isActive: true  },
    { id: 'user-003', username: 'manager2', passwordHash: 'pass5678',  role: 'manager', name: '이매니저', email: 'lee@laundry.com',   phone: '010-3333-4444', createdAt: '2024-03-01', isActive: false },
  ]);

  // ── 필터 ──────────────────────────────────────────────────────
  let roleFilter = $state<'all' | 'admin' | 'manager'>('all');
  let showRoleDropdown = $state(false);
  let searchQuery = $state('');

  const roleFilters = [
    { value: 'all',     label: '전체' },
    { value: 'admin',   label: '관리자' },
    { value: 'manager', label: '실무자' },
  ];

  const filteredUsers = $derived(
    adminUsers.filter((u) => {
      const matchRole = roleFilter === 'all' ? true : u.role === roleFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q
        || u.name.toLowerCase().includes(q)
        || u.username.toLowerCase().includes(q)
        || (u.email ?? '').toLowerCase().includes(q)
        || (u.phone ?? '').toLowerCase().includes(q);
      return matchRole && matchSearch;
    })
  );

  // ── 모달 상태 ──────────────────────────────────────────────────
  let showModal = $state(false);
  let editingUser = $state<AdminUser | null>(null);

  // 폼 필드
  let fName     = $state('');
  let fUsername = $state('');
  let fPassword = $state('');
  let fRole     = $state<'admin' | 'manager'>('manager');
  let fEmail    = $state('');
  let fPhone    = $state('');
  let fIsActive = $state(true);

  function openAddModal() {
    editingUser = null;
    fName     = '';
    fUsername = '';
    fPassword = '';
    fRole     = 'manager';
    fEmail    = '';
    fPhone    = '';
    fIsActive = true;
    showModal = true;
  }

  function openEditModal(user: AdminUser) {
    editingUser = user;
    fName     = user.name;
    fUsername = user.username;
    fPassword = '';
    fRole     = user.role;
    fEmail    = user.email ?? '';
    fPhone    = user.phone ?? '';
    fIsActive = user.isActive;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingUser = null;
  }

  function saveUser() {
    if (!fName.trim()) { alert('이름을 입력해주세요.'); return; }
    if (!editingUser && !fUsername.trim()) { alert('아이디를 입력해주세요.'); return; }
    if (!editingUser && !fPassword.trim()) { alert('비밀번호를 입력해주세요.'); return; }

    if (editingUser) {
      // 수정
      const updates: Partial<Omit<AdminUser, 'id' | 'createdAt'>> = {
        name:     fName.trim(),
        role:     fRole,
        email:    fEmail.trim() || undefined,
        phone:    fPhone.trim() || undefined,
        isActive: fIsActive,
      };
      if (fPassword.trim()) {
        updates.passwordHash = fPassword.trim();
      }
      const idx = adminUsers.findIndex((u) => u.id === editingUser!.id);
      if (idx !== -1) adminUsers[idx] = { ...adminUsers[idx], ...updates };
    } else {
      // 등록
      adminUsers.push({
        id:           crypto.randomUUID(),
        username:     fUsername.trim(),
        passwordHash: fPassword.trim(),
        role:         fRole,
        name:         fName.trim(),
        email:        fEmail.trim() || undefined,
        phone:        fPhone.trim() || undefined,
        createdAt:    new Date().toISOString().slice(0, 10),
        isActive:     fIsActive,
      });
    }
    closeModal();
  }

  function deleteUser(user: AdminUser) {
    if (user.id === 'admin-001') {
      alert('최고 관리자는 삭제할 수 없습니다.');
      return;
    }
    if (!confirm(`"${user.name}" 사용자를 삭제하시겠습니까?`)) return;
    adminUsers = adminUsers.filter((u) => u.id !== user.id);
  }

  function toggleActive(user: AdminUser) {
    const idx = adminUsers.findIndex((u) => u.id === user.id);
    if (idx !== -1) adminUsers[idx] = { ...adminUsers[idx], isActive: !user.isActive };
  }

  // ── 유틸 ──────────────────────────────────────────────────────
  function formatDate(iso: string) {
    return iso ? iso.slice(0, 10) : '-';
  }

  const roleBadge: Record<string, string> = {
    admin:   'badge-secondary',
    manager: 'badge-primary',
  };
  const roleLabel: Record<string, string> = {
    admin:   '관리자',
    manager: '실무자',
  };
</script>

<!-- ───────────────────────────── 페이지 ───────────────────────────── -->
<div class="px-8 py-6 min-h-screen bg-base-200">

  <!-- 상단 헤더 -->
  <h2 class="text-2xl font-extrabold mb-5">사용자 관리</h2>

  <!-- 필터 & 검색 & 추가 버튼 -->
  <div class="flex items-center gap-3 mb-5">

    <!-- 역할 필터 드롭다운 -->
    <div class="dropdown">
      <button
        tabindex="0"
        onclick={() => showRoleDropdown = !showRoleDropdown}
        class="btn btn-sm btn-ghost border border-base-300 bg-base-100 font-semibold gap-2"
      >
        {roleFilters.find(f => f.value === roleFilter)?.label ?? '전체'}
        <Icon icon="lucide:chevron-down" class="w-4 h-4 transition-transform {showRoleDropdown ? 'rotate-180' : ''}" />
      </button>

      {#if showRoleDropdown}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box shadow-md border border-base-200 z-10 min-w-max p-1">
          {#each roleFilters as f (f.value)}
            <li>
              <button
                onclick={() => {
                  roleFilter = f.value as 'all' | 'admin' | 'manager';
                  showRoleDropdown = false;
                }}
                class="font-semibold {roleFilter === f.value ? 'active' : ''}"
              >
                {f.label}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- 검색바 -->
    <label class="input input-bordered input-sm flex items-center gap-2 bg-base-100 w-64">
      <Icon icon="lucide:search" class="w-4 h-4 opacity-50" />
      <input type="text" placeholder="이름, 아이디, 이메일..." bind:value={searchQuery} class="grow" />
    </label>

    <!-- 여백 -->
    <div class="flex-1"></div>

    <!-- 사용자 추가 버튼 -->
    <button class="btn btn-primary btn-sm gap-2 font-bold whitespace-nowrap" onclick={openAddModal}>
      <Icon icon="lucide:plus" class="w-4 h-4" />
      사용자 추가
    </button>
  </div>

  <!-- 테이블 카드 -->
  <div class="card bg-base-100 shadow-sm overflow-x-auto">
    <table class="table table-zebra w-full text-sm">
      <thead>
        <tr>
          <th class="whitespace-nowrap">이름</th>
          <th class="whitespace-nowrap">아이디</th>
          <th class="whitespace-nowrap">역할</th>
          <th class="whitespace-nowrap">이메일</th>
          <th class="whitespace-nowrap">연락처</th>
          <th class="whitespace-nowrap">상태</th>
          <th class="whitespace-nowrap">등록일</th>
          <th class="whitespace-nowrap">액션</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredUsers as user (user.id)}
          <tr class="hover">
            <!-- 이름 -->
            <td class="font-semibold whitespace-nowrap">
              {user.name}
              {#if user.id === 'admin-001'}
                <span class="badge badge-secondary badge-sm ml-1.5 font-bold">최고관리자</span>
              {/if}
            </td>

            <!-- 아이디 -->
            <td class="font-mono opacity-70 whitespace-nowrap">{user.username}</td>

            <!-- 역할 -->
            <td class="whitespace-nowrap">
              {#if user.role === 'admin'}
                <span class="badge badge-secondary font-bold">{roleLabel[user.role] ?? user.role}</span>
              {:else}
                <span class="badge badge-primary font-bold">{roleLabel[user.role] ?? user.role}</span>
              {/if}
            </td>

            <!-- 이메일 -->
            <td class="opacity-70 whitespace-nowrap">{user.email ?? '-'}</td>

            <!-- 연락처 -->
            <td class="opacity-70 whitespace-nowrap">{user.phone ?? '-'}</td>

            <!-- 상태 + 토글 -->
            <td class="whitespace-nowrap">
              <div class="flex items-center gap-2">
                {#if user.isActive}
                  <span class="badge badge-success badge-sm font-bold">활성</span>
                {:else}
                  <span class="badge badge-ghost badge-sm font-bold">비활성</span>
                {/if}
                <input
                  type="checkbox"
                  class="toggle toggle-success toggle-xs"
                  checked={user.isActive}
                  title="{user.isActive ? '비활성화' : '활성화'}"
                  onchange={() => toggleActive(user)}
                />
              </div>
            </td>

            <!-- 등록일 -->
            <td class="opacity-50 text-xs whitespace-nowrap">{formatDate(user.createdAt)}</td>

            <!-- 액션 -->
            <td class="whitespace-nowrap">
              <div class="flex items-center gap-1.5">
                <button
                  class="btn btn-ghost btn-xs font-bold"
                  onclick={() => openEditModal(user)}
                >수정</button>
                <button
                  class="btn btn-error btn-xs font-bold {user.id === 'admin-001' ? 'btn-disabled opacity-30' : ''}"
                  disabled={user.id === 'admin-001'}
                  onclick={() => deleteUser(user)}
                >삭제</button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="8" class="py-12 text-center opacity-50 text-sm">
              해당하는 사용자가 없습니다.
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<!-- ───────────────────────────── 등록/수정 모달 ───────────────────────────── -->
{#if showModal}
  <div
    class="modal modal-open"
    role="dialog"
    aria-modal="true"
    aria-label="사용자 등록/수정 모달"
    tabindex="-1"
    onkeydown={(e) => { if (e.key === 'Escape') closeModal(); }}
    onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
  >
    <div class="modal-box w-full max-w-md" role="document">

      <!-- 모달 헤더 -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-extrabold">
          {editingUser ? '사용자 수정' : '새 사용자 등록'}
        </h3>
        <button
          class="btn btn-ghost btn-sm btn-square"
          onclick={closeModal}
          aria-label="모달 닫기"
        >
          <Icon icon="lucide:x" class="w-4 h-4" />
        </button>
      </div>

      <div class="divider my-0 mb-4"></div>

      <!-- 모달 바디 -->
      <div class="space-y-4">

        <!-- 이름 -->
        <fieldset class="fieldset">
          <legend class="fieldset-legend text-xs font-bold">
            이름 <span class="text-error">*</span>
          </legend>
          <input
            id="f-name"
            type="text"
            bind:value={fName}
            placeholder="홍길동"
            class="input input-bordered w-full"
          />
        </fieldset>

        <!-- 아이디 -->
        <fieldset class="fieldset">
          <legend class="fieldset-legend text-xs font-bold">
            아이디 <span class="text-error">*</span>
          </legend>
          <input
            id="f-username"
            type="text"
            bind:value={fUsername}
            placeholder="user123"
            disabled={!!editingUser}
            class="input input-bordered w-full {editingUser ? 'input-disabled' : ''}"
          />
        </fieldset>

        <!-- 비밀번호 -->
        <fieldset class="fieldset">
          <legend class="fieldset-legend text-xs font-bold">
            비밀번호{editingUser ? '' : ' *'}
          </legend>
          <input
            id="f-password"
            type="password"
            bind:value={fPassword}
            placeholder={editingUser ? '변경 시에만 입력' : '필수'}
            class="input input-bordered w-full"
          />
        </fieldset>

        <!-- 역할 -->
        <fieldset class="fieldset">
          <legend class="fieldset-legend text-xs font-bold">역할</legend>
          <div class="flex gap-2">
            {#each ([{ value: 'admin', label: '관리자' }, { value: 'manager', label: '실무자' }] as const) as r (r.value)}
              <button
                type="button"
                onclick={() => fRole = r.value}
                class="btn btn-sm flex-1
                  {fRole === r.value
                    ? (r.value === 'admin' ? 'btn-secondary' : 'btn-primary')
                    : 'btn-ghost border border-base-300'}"
              >{r.label}</button>
            {/each}
          </div>
        </fieldset>

        <!-- 이메일 -->
        <fieldset class="fieldset">
          <legend class="fieldset-legend text-xs font-bold">이메일</legend>
          <input
            id="f-email"
            type="email"
            bind:value={fEmail}
            placeholder="example@email.com"
            class="input input-bordered w-full"
          />
        </fieldset>

        <!-- 연락처 -->
        <fieldset class="fieldset">
          <legend class="fieldset-legend text-xs font-bold">연락처</legend>
          <input
            id="f-phone"
            type="tel"
            bind:value={fPhone}
            placeholder="010-0000-0000"
            class="input input-bordered w-full"
          />
        </fieldset>

        <!-- 활성화 여부 -->
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-3">
            <input
              id="isActive"
              type="checkbox"
              bind:checked={fIsActive}
              class="toggle toggle-primary toggle-sm"
            />
            <span class="label-text font-semibold">계정 활성화</span>
          </label>
        </div>
      </div>

      <div class="divider my-4"></div>

      <!-- 모달 푸터 -->
      <div class="modal-action mt-0 justify-end gap-2">
        <button class="btn btn-ghost btn-sm font-bold" onclick={closeModal}>취소</button>
        <button class="btn btn-primary btn-sm font-bold" onclick={saveUser}>
          {editingUser ? '저장' : '등록'}
        </button>
      </div>
    </div>
  </div>
{/if}
