<script lang="ts">
	import '../app.css';
	import { initAuth } from '$lib/api/auth';
	let { children } = $props();
	initAuth();
</script>

{@render children()}
