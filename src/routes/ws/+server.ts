/**
 * WebSocketハンドラー
 * 
 * 注意: SvelteKitの標準機能ではWebSocketを直接サポートしていません。
 * 開発環境では、Viteの開発サーバーでWebSocketを処理する必要があります。
 * 
 * 現在の実装では、開発環境ではブラウザが直接WebSocket接続を確立します。
 */

import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
  return new Response('WebSocket endpoint', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
