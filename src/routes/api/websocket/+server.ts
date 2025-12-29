import type { RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { HttpServer } from 'vite';

/**
 * WebSocketアップグレードハンドラー
 * 
 * SvelteKitでWebSocketを使用するには、アダプター側でWebSocketサポートが必要です。
 * 開発環境ではViteのプラグインを使用し、本番環境ではnode-adapterなどを使用します。
 */

// WebSocketサーバーのグローバルインスタンス（開発時のみ）
let wsServer: HttpServer | null = null;

/**
 * GET リクエスト処理
 * WebSocket接続のアップグレード要求を処理
 */
export const GET: RequestHandler = async ({ request }) => {
  // WebSocketアップグレードリクエストかチェック
  const upgradeHeader = request.headers.get('upgrade');

  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade request', { status: 426 });
  }

  // この時点でWebSocketアップグレードが必要
  // 実際のアップグレード処理はアダプター側で行われる
  return new Response('WebSocket endpoint', {
    status: 101,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
    },
  });
};

/**
 * 開発環境用のWebSocketセットアップ
 * これはViteプラグインで処理される想定
 */
if (dev && import.meta.hot) {
  import.meta.hot.on('vite:beforeFullReload', () => {
    if (wsServer) {
      wsServer.close();
      wsServer = null;
    }
  });
}
