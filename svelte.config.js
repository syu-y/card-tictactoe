import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // adapter-node を使用してNode.jsサーバー用にビルド
    adapter: adapter({
      out: 'build'
    }),

    alias: {
      $lib: './src/lib',
      '$lib/*': './src/lib/*'
    }
  },

  compilerOptions: {
    // Svelte 5のルーン モードを有効化
    runes: true
  }
};

export default config;
