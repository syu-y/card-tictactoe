// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';

// グローバルなWebSocketサーバーインスタンス
let wsServerInitialized = false;

/**
 * サーバー起動時にWebSocketサーバーを初期化
 */
if (!building && !wsServerInitialized) {
  // WebSocketサーバーの初期化はここでは行わない
  // 代わりに、+server.tsルートで処理する
  wsServerInitialized = true;
}

/**
 * リクエストハンドラー
 */
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  return response;
};

/**
 * グローバルエラーハンドラー
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handleError = ({ error, event }) => {
  console.error('Server error:', error);

  return {
    message: 'An error occurred',
    // code: (error as any)?.code || 'UNKNOWN',
  };
};
