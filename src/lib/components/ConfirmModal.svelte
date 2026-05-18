<script lang="ts">
  import Icon from '@iconify/svelte';

  type Variant = 'danger' | 'warning' | 'info';

  interface Props {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: Variant;
    loading?: boolean;
    onconfirm: () => void;
    oncancel: () => void;
  }

  let {
    open,
    title,
    message,
    confirmLabel = '확인',
    cancelLabel = '취소',
    variant = 'danger',
    loading = false,
    onconfirm,
    oncancel,
  }: Props = $props();

  const iconMap: Record<Variant, string> = {
    danger: 'lucide:trash-2',
    warning: 'lucide:alert-triangle',
    info: 'lucide:info',
  };

  const btnMap: Record<Variant, string> = {
    danger: 'btn-error',
    warning: 'btn-warning',
    info: 'btn-primary',
  };

  const iconColorMap: Record<Variant, string> = {
    danger: 'text-error',
    warning: 'text-warning',
    info: 'text-info',
  };

  const icon = $derived(iconMap[variant]);
  const btnClass = $derived(btnMap[variant]);
  const iconColor = $derived(iconColorMap[variant]);
</script>

{#if open}
  <dialog class="modal modal-open">
    <div class="modal-box max-w-sm">
      <div class="flex items-start gap-3">
        <Icon icon={icon} class="{iconColor} mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h3 class="font-semibold text-base-content">{title}</h3>
          <p class="mt-1 text-sm text-base-content/70">{message}</p>
        </div>
      </div>
      <div class="modal-action mt-4 gap-2">
        <button class="btn btn-sm btn-ghost" onclick={oncancel} disabled={loading}>
          {cancelLabel}
        </button>
        <button
          class="btn btn-sm {btnClass} {loading ? 'loading' : ''}"
          onclick={onconfirm}
          disabled={loading}
        >
          {#if !loading}
            {confirmLabel}
          {/if}
        </button>
      </div>
    </div>
    <div
      class="modal-backdrop"
      role="button"
      tabindex="-1"
      onclick={oncancel}
      onkeydown={() => {}}
    ></div>
  </dialog>
{/if}
