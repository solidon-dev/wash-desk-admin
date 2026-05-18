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
	if (!raw) return '업데이트에 실패했습니다. 같은 문제가 반복된다면 관리자에게 문의해 주세요.';
	if (raw.includes('권한')) return '이 작업을 수행할 권한이 없습니다.';
	if (raw.includes('unique') || raw.includes('duplicate') || raw.includes('already exists'))
		return '이미 동일한 항목이 존재합니다.';
	if (raw.includes('network') || raw.includes('fetch'))
		return '네트워크 연결을 확인하고 다시 시도해 주세요.';
	// 그 외는 그대로 반환 (서버가 이미 한국어 메시지를 반환하는 경우)
	return raw;
}

type BaseOptions = {
	onError?: (message: string) => void;
	onRollback?: () => void;
	revalidate?: boolean;
};

/**
 * 서버 action 호출 (fetch + deserialize 패턴)
 *
 * ### responseKey 있는 경우 — 서버 응답에서 row를 꺼내 반환
 * ```ts
 * const saved = await submitAction<ClientRow>('update', payload, {
 *   responseKey: 'client',
 *   onRollback: () => list.clear(id),
 *   onError: showErrorModal,
 * });
 * // saved: ClientRow | null
 * ```
 *
 * ### responseKey 없는 경우 — 성공 시 true 반환
 * ```ts
 * const ok = await submitAction('create', payload, {
 *   onError: showErrorModal,
 *   revalidate: true,
 * });
 * // ok: true | null
 * ```
 */
export async function submitAction<T>(
	action: string,
	payload: Record<string, string>,
	options: BaseOptions & { responseKey: string }
): Promise<T | null>;
export async function submitAction(
	action: string,
	payload: Record<string, string>,
	options?: BaseOptions & { responseKey?: never }
): Promise<true | null>;
export async function submitAction<T>(
	action: string,
	payload: Record<string, string>,
	options?: BaseOptions & { responseKey?: string }
): Promise<T | true | null> {
	const { responseKey, onError, onRollback, revalidate = false } = options ?? {};

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
			return null;
		}

		if (revalidate) {
			await invalidateAll();
		}

		if (responseKey) {
			const data = 'data' in result ? result.data : undefined;
			return ((data as Record<string, unknown>)?.[responseKey] as T) ?? null;
		}
		return true;
	} catch {
		onRollback?.();
		onError?.(friendlyError());
		return null;
	}
}
