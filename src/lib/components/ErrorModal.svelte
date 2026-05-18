<script lang="ts">
  import Icon from '@iconify/svelte';

  interface Props {
    open: boolean;
    message: string;
    onclose: () => void;
  }

  let { open, message, onclose }: Props = $props();
</script>

{#if open}
  <dialog class="modal modal-open">
    <div class="modal-box max-w-sm">
      <div class="flex items-start gap-3">
        <Icon icon="lucide:alert-circle" class="text-error mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h3 class="font-semibold text-base-content">오류가 발생했습니다</h3>
          <p class="mt-1 text-sm text-base-content/70">{message}</p>
        </div>
      </div>
      <div class="modal-action mt-4">
        <button class="btn btn-sm" onclick={onclose}>확인</button>
      </div>
    </div>
    <div
      class="modal-backdrop"
      role="button"
      tabindex="-1"
      onclick={onclose}
      onkeydown={() => {}}
    ></div>
  </dialog>
{/if}
