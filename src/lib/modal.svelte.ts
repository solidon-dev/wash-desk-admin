import type { Snippet } from 'svelte';

// 현재 열린 모달 snippet — null이면 닫힌 상태
let _current = $state<Snippet | null>(null);

export const modal = {
	get current() { return _current; },

	open(snippet: Snippet) {
		_current = snippet;
	},

	close() {
		_current = null;
	},
};
