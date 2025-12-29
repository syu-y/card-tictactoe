import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],

	// server: {
	// 	port: 5173,
	// 	strictPort: false,
	// },

	server: {
		host: '0.0.0.0',
		allowedHosts: [
			'localhost',
			'.railway.app',
			'.up.railway.app'
		]
	}

	build: {
		target: 'esnext',
		sourcemap: true,
	},

	optimizeDeps: {
		exclude: ['ws'],
	},

	ssr: {
		noExternal: [],
	}
});
