import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	onwarn: (warning, handler) => {
		// 낙관적 업데이트 패턴($state + $effect)에서 발생하는 컴파일러 경고 무시
		if (warning.code === 'state_referenced_locally') return;
		if (warning.code === 'prefer_writable_derived') return;
		handler(warning);
	},
	kit: {
		adapter: adapter()
	}
};

export default config;
