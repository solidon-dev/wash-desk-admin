import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';

// 에러 메시지 표준화
export function parseActionError(result: ReturnType<typeof deserialize>): string {
  if (result.type === 'failure') {
    const msg = (result.data as Record<string, unknown>)?.error;
    if (typeof msg === 'string') return msg;
  }
  return '';
}

// 에러 메시지 매핑 (서버 에러 메시지 → 사용자 친화적 메시지)
export function friendlyError(raw?: string): string {
  if (!raw)
    return '업데이트에 실패했습니다. 같은 문제가 반복된다면 관리자에게 문의해 주세요.';
  if (raw.includes('권한')) return '이 작업을 수행할 권한이 없습니다.';
  if (
    raw.includes('unique') ||
    raw.includes('duplicate') ||
    raw.includes('already exists')
  )
    return '이미 동일한 항목이 존재합니다.';
  if (raw.includes('network') || raw.includes('fetch'))
    return '네트워크 연결을 확인하고 다시 시도해 주세요.';
  // 그 외는 그대로 반환 (서버가 이미 한국어 메시지를 반환하는 경우)
  return raw;
}

/**
 * 서버 action 호출 (fetch + deserialize 패턴)
 *
 * @param action     - URL action 이름 (예: 'updateItem')
 * @param payload    - FormData에 담을 key-value 쌍
 * @param options
 *   - onError:    에러 메시지 문자열을 받는 콜백 (에러 모달 표시용)
 *   - onRollback: 실패 시 낙관적 업데이트 롤백 콜백
 *   - revalidate: true면 성공 후 invalidateAll() 호출
 * @returns 성공 여부 (true / false)
 */
export async function submitAction(
  action: string,
  payload: Record<string, string>,
  options?: {
    onError?: (message: string) => void;
    onRollback?: () => void;
    revalidate?: boolean;
  }
): Promise<boolean> {
  const { onError, onRollback, revalidate = false } = options ?? {};

  const form = new FormData();
  for (const [k, v] of Object.entries(payload)) {
    form.append(k, v);
  }

  try {
    const res = await fetch(`?/${action}`, { method: 'POST', body: form });
    const result = deserialize(await res.text());

    if (result.type === 'failure' || result.type === 'error') {
      onRollback?.();
      const raw = parseActionError(result);
      onError?.(friendlyError(raw || undefined));
      return false;
    }

    if (revalidate) {
      await invalidateAll();
    }

    return true;
  } catch {
    onRollback?.();
    onError?.(friendlyError());
    return false;
  }
}
