import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		// These packages have CJS/ESM issues - externalize them for SSR
		external: ['dockerode', 'ssh2', 'geoip-lite']
	}
});
