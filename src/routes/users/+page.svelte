<script lang="ts">
  import Icon from '@iconify/svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import TableCard from '$lib/components/TableCard.svelte';

  type Role = 'master' | 'admin' | 'manager';

  interface User {
    id: string;
    name: string;
    username: string;
    password: string;
    role: Role;
    email?: string;
    phone?: string;
    isActive: boolean;
    createdAt: string;
  }

  const roleLabel: Record<Role, string> = {
    master:  '마스터',
    admin:   '관리자',
    manager: '실무자',
  };

  const roleBadge: Record<Role, string> = {
    master:  'badge-error',
    admin:   'badge-primary',
    manager: 'badge-ghost',
  };

  let users = $state<User[]>([
    { id: 'user-001', name: '슈퍼관리자', username: 'master',   password: 'master1234', role: 'master',  email: 'master@laundry.com',  phone: '010-0000-0001', isActive: true,  createdAt: '2024-01-01' },
    { id: 'user-002', name: '김관리',     username: 'admin1',   password: 'admin1234',  role: 'admin',   email: 'admin1@laundry.com',  phone: '010-1111-0001', isActive: true,  createdAt: '2024-02-01' },
    { id: 'user-003', name: '이관리',     username: 'admin2',   password: 'admin5678',  role: 'admin',   email: 'admin2@laundry.com',  phone: '010-1111-0002', isActive: true,  createdAt: '2024-03-01' },
    { id: 'user-004', name: '박실무',     username: 'manager1', password: 'pass1234',   role: 'manager', email: 'mgr1@laundry.com',    phone: '010-2222-0001', isActive: true,  createdAt: '2024-04-01' },
    { id: 'user-005', name: '최실무',     username: 'manager2', password: 'pass5678',   role: 'manager', email: 'mgr2@laundry.com',    phone: '010-2222-0002', isActive: false, createdAt: '2024-04-15' },
    { id: 'user-006', name: '정실무',     username: 'manager3', password: 'pass9012',   role: 'manager', email: 'mgr3@laundry.com',    phone: '010-2222-0003', isActive: true,  createdAt: '2024-05-01' },
    { id: 'user-007', name: '강실무',     username: 'manager4', password: 'pass3456',   role: 'manager', email: 'mgr4@laundry.com',    phone: '010-2222-0004', isActive: true,  createdAt: '2024-05-20' },
    { id: 'user-008', name: '조실무',     username: 'manager5', password: 'pass7890',   role: 'manager', email: 'mgr5@laundry.com',    phone: '010-2222-0005', isActive: false, createdAt: '2024-06-01' },
    { id: 'user-009', name: '윤실무',     username: 'manager6', password: 'pass2345',   role: 'manager', email: 'mgr6@laundry.com',    phone: '010-2222-0006', isActive: true,  createdAt: '2024-07-01' },
    { id: 'user-010', name: '임실무',     username: 'manager7', password: 'pass6789',   role: 'manager', email: 'mgr7@laundry.com',    phone: '010-2222-0007', isActive: true,  createdAt: '2024-08-01' },
    { id: 'user-011', name: '한실무',     username: 'manager8', password: 'pass0123',   role: 'manager', email: 'mgr8@laundry.com',    phone: '010-2222-0008', isActive: true,  createdAt: '2024-09-01' },
    { id: 'user-012', name: '오실무',     username: 'manager9', password: 'pass4567',   role: 'manager', email: 'mgr9@laundry.com',    phone: '010-2222-0009', isActive: false, createdAt: '2024-10-01' },
  ]);

  // ── 검색 ──
  let selectedId = $state('');

  const searchItems = $derived(
    users.map((u) => ({ id: u.id, label: u.name, sub: u.username }))
  );

  // ── 페이지네이션 ──
  const PAGE_SIZE = 10;
  let currentPage = $state(1);

  const filteredUsers = $derived(
    users.filter((u) => selectedId ? u.id === selectedId : true)
  );

  $effect(() => { selectedId; currentPage = 1; });

  const totalPages   = $derived(Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE)));
  const visibleUsers = $derived(filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

  function formatDate(iso: string) { return iso.slice(0, 10); }

  // ── 등록/수정 모달 ──
  let showModal        = $state(false);
  let editingUser      = $state<User | null>(null);
  let formName         = $state('');
  let formUsername     = $state('');
  let formPassword     = $state('');
  let formPasswordConf = $state('');
  let formRole         = $state<Role>('manager');
  let formEmail        = $state('');
  let formPhone        = $state('');
  let showPassword     = $state(false);
  let showPasswordConf = $state(false);

  const passwordMismatch = $derived(
    formPasswordConf.length > 0 && formPassword !== formPasswordConf
  );

  function openAdd() {
    editingUser      = null;
    formName         = '';
    formUsername     = '';
    formPassword     = '';
    formPasswordConf = '';
    formRole         = 'manager';
    formEmail        = '';
    formPhone        = '';
    showPassword     = false;
    showPasswordConf = false;
    showModal        = true;
  }

  function openEdit(user: User) {
    editingUser      = user;
    formName         = user.name;
    formUsername     = user.username;
    formPassword     = user.password;
    formPasswordConf = user.password;
    formRole         = user.role;
    formEmail        = user.email ?? '';
    formPhone        = user.phone ?? '';
    showPassword     = false;
    showPasswordConf = false;
    showModal        = true;
  }

  function closeModal() { showModal = false; }

  function handleSave() {
    if (!formName.trim() || !formUsername.trim() || !formPassword.trim()) return;
    if (passwordMismatch) return;
    const payload = {
      name:     formName.trim(),
      username: formUsername.trim(),
      password: formPassword.trim(),
      role:     formRole,
      email:    formEmail.trim() || undefined,
      phone:    formPhone.trim() || undefined,
    };
    if (editingUser) {
      const idx = users.findIndex((u) => u.id === editingUser!.id);
      if (idx !== -1) users[idx] = { ...users[idx], ...payload };
    } else {
      users.push({ ...payload, id: crypto.randomUUID(), isActive: true, createdAt: new Date().toISOString().slice(0, 10) });
    }
    closeModal();
  }

  // ── 활성/비활성 토글 ──
  function toggleActive(id: string) {
    const idx = users.findIndex((u) => u.id === id);
    if (idx !== -1) users[idx].isActive = !users[idx].isActive;
  }

  // ── 삭제 확인 모달 ──
  let deleteTargetId = $state<string | null>(null);
  function openDelete(id: string) { deleteTargetId = id; }
  function confirmDelete() {
    if (deleteTargetId) {
      users = users.filter((u) => u.id !== deleteTargetId);
      if (selectedId === deleteTargetId) selectedId = '';
    }
    deleteTargetId = null;
    closeModal();
  }
  function cancelDelete() { deleteTargetId = null; }
</script>

<!-- ───────────────────────────── 메인 컨텐츠 ───────────────────────────── -->
<div class="min-h-full bg-base-200 px-8 py-10">
  <h2 class="text-2xl font-extrabold text-base-content mb-5">사용자 관리</h2>

  <!-- 검색 / 등록 버튼 바 -->
  <div class="flex flex-wrap items-center gap-3 mb-5">
    <SearchBar
      placeholder="이름, 아이디 검색..."
      items={searchItems}
      onselect={(id) => (selectedId = id)}
      class="w-64 sm:w-72"
    />
    <button onclick={openAdd} class="btn btn-primary btn-sm gap-2 whitespace-nowrap ml-auto sm:w-auto w-full">
      <Icon icon="lucide:plus" class="w-4 h-4" />
      사용자 등록
    </button>
  </div>

  <!-- 사용자 테이블 -->
  <TableCard>
    <table class="table table-sm w-full" style="table-layout: fixed;">
      <thead class="bg-base-200 text-base-content/60">
        <tr>
          <!-- 이름+역할 묶음 -->
          <th class="text-xs font-bold w-[35%] sm:w-[30%] lg:w-[18%] xl:w-[16%]">이름</th>
          <th class="text-xs font-bold hidden lg:table-cell lg:w-[10%] xl:w-[8%]">역할</th>
          <!-- 아이디+이메일+연락처 -->
          <th class="text-xs font-bold hidden lg:table-cell lg:w-[16%] xl:w-[14%]">아이디</th>
          <th class="text-xs font-bold hidden xl:table-cell w-[18%]">이메일</th>
          <th class="text-xs font-bold hidden xl:table-cell w-[14%]">연락처</th>
          <th class="text-xs font-bold hidden lg:table-cell whitespace-nowrap lg:w-[10%] xl:w-[8%]">등록일</th>
          <th class="text-xs font-bold text-center whitespace-nowrap w-[65%] sm:w-[70%] lg:w-[36%] xl:w-[22%]">액션</th>
        </tr>
      </thead>
      <tbody>
        {#if filteredUsers.length === 0}
          <tr>
            <td colspan="7" class="py-16 text-center text-base-content/40 text-sm">
              검색 결과가 없습니다.
            </td>
          </tr>
        {:else}
          {#each visibleUsers as user (user.id)}
            <tr class="hover:bg-base-200 transition-colors {!user.isActive ? 'opacity-50' : ''}">

              <!-- 이름 -->
              <td class="font-semibold text-base-content">
                <span>{user.name}</span>
                <!-- lg 미만: 역할·아이디·등록일 인라인 -->
                <div class="lg:hidden mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span class="badge badge-xs font-bold {roleBadge[user.role]}">{roleLabel[user.role]}</span>
                  <span class="text-xs text-base-content/50 font-mono">{user.username}</span>
                  {#if user.email}<span class="text-xs text-base-content/40">{user.email}</span>{/if}
                  <span class="text-xs text-base-content/30">{formatDate(user.createdAt)}</span>
                </div>
              </td>

              <!-- 역할 -->
              <td class="hidden lg:table-cell">
                <span class="badge badge-sm font-bold {roleBadge[user.role]}">{roleLabel[user.role]}</span>
              </td>

              <!-- 아이디 -->
              <td class="text-base-content/70 text-sm font-mono hidden lg:table-cell">{user.username}</td>

              <!-- 이메일 -->
              <td class="text-base-content/60 text-xs hidden xl:table-cell">{user.email ?? '—'}</td>

              <!-- 연락처 -->
              <td class="text-base-content/70 text-sm hidden xl:table-cell">{user.phone ?? '—'}</td>

              <!-- 등록일 -->
              <td class="text-base-content/50 text-xs whitespace-nowrap hidden lg:table-cell">{formatDate(user.createdAt)}</td>

              <!-- 액션 -->
              <td>
                <div class="flex items-center justify-center">
                  <button
                    onclick={() => openEdit(user)}
                    class="btn btn-ghost btn-xs text-primary font-semibold"
                  >수정</button>
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </TableCard>

  <!-- 페이지네이션 -->
  <div class="mt-4">
    <Pagination
      {currentPage}
      {totalPages}
      totalItems={filteredUsers.length}
      pageSize={PAGE_SIZE}
      onpage={(p) => (currentPage = p)}
    />
  </div>
</div>

<!-- ───────────────────────── 사용자 등록/수정 모달 ───────────────────────── -->
{#if showModal}
  <dialog
    class="modal modal-open"
    onmousedown={(e) => { if (e.target === e.currentTarget) closeModal(); }}
  >
    <div class="modal-box w-full max-w-lg rounded-2xl p-6 flex flex-col" style="max-height: 600px;">

      <!-- 헤더 -->
      <div class="flex items-center justify-between mb-5 shrink-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="text-lg font-extrabold text-base-content">
            {editingUser ? '사용자 수정' : '사용자 등록'}
          </h3>
          {#if editingUser}
            <button
              type="button"
              onclick={() => { toggleActive(editingUser!.id); editingUser = { ...editingUser!, isActive: !editingUser!.isActive }; }}
              class="btn btn-xs gap-1 font-bold {editingUser.isActive ? 'btn-warning' : 'btn-success'}"
            >
              <Icon icon={editingUser.isActive ? 'lucide:user-x' : 'lucide:user-check'} class="w-3.5 h-3.5" />
              {editingUser.isActive ? '비활성화' : '활성화'}
            </button>
            <button
              type="button"
              onclick={() => openDelete(editingUser!.id)}
              class="btn btn-xs btn-error gap-1 font-bold"
            >
              <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
              삭제
            </button>
          {/if}
        </div>
        <button onclick={closeModal} aria-label="닫기" class="btn btn-ghost btn-sm btn-circle">
          <Icon icon="lucide:x" class="w-5 h-5" />
        </button>
      </div>

      <!-- 폼 -->
      <form
        onsubmit={(e) => { e.preventDefault(); handleSave(); }}
        class="flex flex-col flex-1 overflow-hidden"
      >
        <div class="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">

          <!-- 이름 -->
          <div>
            <label for="uName" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">이름 *</span>
            </label>
            <input id="uName" type="text" bind:value={formName} placeholder="홍길동"
              class="input input-bordered w-full text-sm" required />
          </div>

          <!-- 아이디 + 역할 (2열) -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="uUsername" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">아이디 *</span>
              </label>
              <input id="uUsername" type="text" bind:value={formUsername} placeholder="user_id"
                class="input input-bordered w-full text-sm" required />
            </div>
            <div>
              <p class="label-text text-xs font-bold text-base-content/60 mb-2 mt-1">역할 *</p>
              <div class="flex gap-1.5">
                {#each (['master', 'admin', 'manager'] as Role[]) as r}
                  <button
                    type="button"
                    onclick={() => (formRole = r)}
                    class="btn btn-xs font-bold flex-1 {formRole === r ? 'btn-primary' : 'btn-outline btn-ghost'}"
                  >{roleLabel[r]}</button>
                {/each}
              </div>
            </div>
          </div>

          <!-- 비밀번호 + 비밀번호 확인 (2열) -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="uPassword" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">비밀번호 *</span>
              </label>
              <div class="relative">
                <input
                  id="uPassword"
                  type={showPassword ? 'text' : 'password'}
                  bind:value={formPassword}
                  placeholder="비밀번호 입력"
                  class="input input-bordered w-full text-sm pr-9"
                  required
                />
                <button type="button" onclick={() => (showPassword = !showPassword)}
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70 transition-colors">
                  <Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label for="uPasswordConf" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">
                  비밀번호 확인 *
                  {#if passwordMismatch}
                    <span class="text-error ml-1">불일치</span>
                  {/if}
                </span>
              </label>
              <div class="relative">
                <input
                  id="uPasswordConf"
                  type={showPasswordConf ? 'text' : 'password'}
                  bind:value={formPasswordConf}
                  placeholder="다시 입력"
                  class="input input-bordered w-full text-sm pr-9 {passwordMismatch ? 'input-error' : ''}"
                  required
                />
                <button type="button" onclick={() => (showPasswordConf = !showPasswordConf)}
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70 transition-colors">
                  <Icon icon={showPasswordConf ? 'lucide:eye-off' : 'lucide:eye'} class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- 이메일 + 연락처 (2열) -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="uEmail" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">이메일</span>
              </label>
              <input id="uEmail" type="email" bind:value={formEmail} placeholder="user@example.com"
                class="input input-bordered w-full text-sm" />
            </div>
            <div>
              <label for="uPhone" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">연락처</span>
              </label>
              <input id="uPhone" type="text" bind:value={formPhone} placeholder="010-0000-0000"
                class="input input-bordered w-full text-sm" />
            </div>
          </div>
        </div>

        <!-- 액션 버튼 -->
        <div class="modal-action mt-5 pt-4 border-t border-base-200 shrink-0">
          <button type="button" onclick={closeModal} class="btn btn-ghost font-bold">취소</button>
          <button type="submit" disabled={passwordMismatch} class="btn btn-primary font-bold disabled:opacity-50">
            {editingUser ? '저장' : '등록'}
          </button>
        </div>
      </form>
    </div>
  </dialog>
{/if}

<!-- ───────────────────────────── 삭제 확인 모달 ───────────────────────────── -->
{#if deleteTargetId}
  {@const target = users.find((u) => u.id === deleteTargetId)}
  <dialog
    class="modal modal-open"
    onmousedown={(e) => { if (e.target === e.currentTarget) cancelDelete(); }}
  >
    <div class="modal-box w-full max-w-sm rounded-2xl p-6">
      <h3 class="text-base font-extrabold text-base-content mb-2">사용자 삭제</h3>
      <p class="text-sm text-base-content/70 mb-6">
        <span class="font-bold text-error">{target?.name}</span> 계정을 삭제하시겠습니까?<br />
        <span class="text-xs text-base-content/40">삭제된 계정은 복구할 수 없습니다.</span>
      </p>
      <div class="modal-action">
        <button onclick={cancelDelete} class="btn btn-ghost font-bold">취소</button>
        <button onclick={confirmDelete} class="btn btn-error font-bold">삭제</button>
      </div>
    </div>
  </dialog>
{/if}
