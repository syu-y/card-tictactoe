// src/lib/stores/websocketStore.ts
import { writable } from 'svelte/store';
import type { ClientMessage, ServerMessage } from '$lib/server/types/game.types';

/**
 * WebSocket接続状態
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * WebSocketストアの型
 */
interface WebSocketStore {
  state: ConnectionState;
  error: string | null;
  lastMessage: ServerMessage | null;
}

/**
 * WebSocketストアの初期値
 */
const initialState: WebSocketStore = {
  state: 'disconnected',
  error: null,
  lastMessage: null,
};

/**
 * WebSocketストア
 */
function createWebSocketStore() {
  const { subscribe, set, update } = writable<WebSocketStore>(initialState);

  let socket: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3秒

  /**
   * メッセージハンドラーのコールバック
   */
  const messageHandlers: ((message: ServerMessage) => void)[] = [];

  /**
   * WebSocket接続を確立
   */
  function connect(url?: string): void {
    if (socket?.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    // WebSocket URLを決定
    const wsUrl = url || getWebSocketUrl();

    update(state => ({ ...state, state: 'connecting', error: null }));

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('✅ WebSocket connected');
        reconnectAttempts = 0;
        update(state => ({ ...state, state: 'connected', error: null }));
      };

      socket.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          console.log('📨 Received message:', message.type, message);

          // ストアを更新
          update(state => ({ ...state, lastMessage: message }));

          // 登録されたハンドラーを呼び出し
          messageHandlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        update(state => ({
          ...state,
          state: 'error',
          error: 'Connection error'
        }));
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        update(state => ({ ...state, state: 'disconnected' }));

        // 自動再接続を試みる
        attemptReconnect(wsUrl);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      update(state => ({
        ...state,
        state: 'error',
        error: 'Failed to connect'
      }));
    }
  }

  /**
   * 再接続を試みる
   */
  function attemptReconnect(url: string): void {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      update(state => ({
        ...state,
        error: 'Failed to reconnect. Please refresh the page.'
      }));
      return;
    }

    reconnectAttempts++;
    console.log(`Reconnecting... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);

    reconnectTimeout = setTimeout(() => {
      connect(url);
    }, reconnectDelay);
  }

  /**
   * メッセージを送信
   */
  function send(message: ClientMessage): boolean {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }

    try {
      console.log('📤 Sending message:', message.type, message);
      socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * 接続を切断
   */
  function disconnect(): void {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (socket) {
      socket.close();
      socket = null;
    }

    reconnectAttempts = 0;
    set(initialState);
  }

  /**
   * メッセージハンドラーを登録
   */
  function onMessage(handler: (message: ServerMessage) => void): () => void {
    messageHandlers.push(handler);

    // アンサブスクライブ関数を返す
    return () => {
      const index = messageHandlers.indexOf(handler);
      if (index > -1) {
        messageHandlers.splice(index, 1);
      }
    };
  }

  /**
   * WebSocket URLを生成
   */
  function getWebSocketUrl(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    // 開発環境では専用ポート3001を使用
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'ws://localhost:3001';
    }

    // 本番環境
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }

  /**
   * 接続状態を取得
   */
  function getConnectionState(): ConnectionState {
    if (!socket) return 'disconnected';

    switch (socket.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'disconnected';
    }
  }

  return {
    subscribe,
    connect,
    disconnect,
    send,
    onMessage,
    getConnectionState,
  };
}

/**
 * WebSocketストアのシングルトンインスタンス
 */
export const websocketStore = createWebSocketStore();

/**
 * WebSocket接続用のヘルパー関数
 */
export function useWebSocket() {
  return websocketStore;
}
