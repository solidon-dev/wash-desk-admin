<script lang="ts">
	import '../app.css';
	import { initAuth } from '$lib/stores/auth';
	let { children } = $props();
	initAuth();
</script>

{@render children()}
