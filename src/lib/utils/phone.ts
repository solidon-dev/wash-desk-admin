/** 숫자만 추출 */
function digits(v: string) {
	return v.replace(/\D/g, '');
}

/**
 * 입력 중 자동 하이픈 포맷
 * 010-1234-5678 / 010-123-4567 형태
 */
export function formatPhone(v: string): string {
	const d = digits(v).slice(0, 11);
	if (d.length <= 3) return d;
	if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
	return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/**
 * 저장 시 하이픈 제거 (DB는 숫자만 저장)
 */
export function unformatPhone(v: string): string {
	return digits(v);
}

/**
 * 표시용: 숫자만 저장된 값을 하이픈 포함으로 변환
 */
export function displayPhone(v: string | null | undefined): string {
	if (!v) return '—';
	return formatPhone(v);
}
