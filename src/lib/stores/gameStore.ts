// src/lib/stores/gameStore.ts
import { writable, derived } from 'svelte/store';
import type { GameState, PlayerId, Position, CardParams } from '$lib/server/types/game.types';
import { websocketStore } from './websocketStore';

/**
 * ゲームストアの状態
 */
interface GameStoreState {
  matchedRoomId: string | null;
  gameState: GameState | null;
  myPlayerId: PlayerId | null;
  myPlayerIndex: 0 | 1 | null;
  roomId: string | null;
  isMyTurn: boolean;
  selectedCard: number | null;
  selectedPosition: Position | null;
  error: string | null;
  opponentLeft: boolean;
  rematchRequested: boolean;
  rematchStarted: boolean;
}

/**
 * 初期状態
 */
const initialState: GameStoreState = {
  matchedRoomId: null,
  gameState: null,
  myPlayerId: null,
  myPlayerIndex: null,
  roomId: null,
  isMyTurn: false,
  selectedCard: null,
  selectedPosition: null,
  error: null,
  opponentLeft: false,
  rematchRequested: false,
  rematchStarted: false
};

/**
 * ゲームストア
 */
function createGameStore() {
  const { subscribe, set, update } = writable<GameStoreState>(initialState);

  /**
   * WebSocketメッセージハンドラーを登録
   */
  websocketStore.onMessage((message) => {
    console.log('🎮 Game handling message:', message.type);

    switch (message.type) {
      case 'ROOM_JOINED':
        console.log('✅ Joined room as player', message.playerIndex);
        update(state => ({
          ...state,
          myPlayerId: message.playerId,
          myPlayerIndex: message.playerIndex,
        }));
        break;

      case 'GAME_STATE':
        console.log('📊 Received game state:', message.state.phase);
        update(state => {
          const newState = { ...state, gameState: message.state };

          // 自分のターンかチェック
          if (message.state && state.myPlayerIndex !== null) {
            newState.isMyTurn = message.state.currentPlayer === state.myPlayerIndex;
            console.log('🎯 My turn:', newState.isMyTurn);
          }

          return newState;
        });
        break;

      case 'GAME_STARTED':
        console.log('🎮 Game started!');
        break;

      case 'TURN_START':
        update(state => ({
          ...state,
          isMyTurn: message.playerId === state.myPlayerId,
          selectedCard: null,
          selectedPosition: null,
        }));
        break;

      case 'CARD_USED':
        console.log(`Card used: ${message.cardName}`);
        break;

      case 'MARK_PLACED':
        console.log(`Mark placed at ${message.position.row}, ${message.position.col}`);
        break;

      case 'GAME_OVER':
        console.log(`Game over! Winner: ${message.winner}`);
        update(state => ({
          ...state,
          isMyTurn: false,
          rematchRequested: false
        }));
        break;

      case 'ERROR':
        update(state => ({
          ...state,
          error: message.message,
        }));
        setTimeout(() => {
          update(state => ({ ...state, error: null }));
        }, 5000);
        break;

      case 'INFO':
        update(state => ({
          ...state,
          error: message.message, // INFOもerrorフィールドに表示（実際は情報メッセージ）
        }));
        setTimeout(() => {
          update(state => ({ ...state, error: null }));
        }, 3000); // 3秒で消える
        break;

      case 'OPPONENT_JOINED':
        console.log(`Opponent joined: ${message.opponentName}`);
        break;

      case 'OPPONENT_LEFT':
        console.log('Opponent left the game');
        update(state => ({
          ...state,
          opponentLeft: true,
          error: '相手プレイヤーが退出しました',
        }));
        break;

      case 'MATCH_FOUND':
        console.log('✅ Match found! Joining room:', message.roomId);
        update(state => ({
          ...state,
          matchedRoomId: message.roomId,
          // myPlayerId: message.playerId,
          myPlayerIndex: message.playerIndex,
        }));
        break;

      case 'REMATCH_REQUESTED':
        console.log('🔄 Opponent requested rematch');
        update(state => ({
          ...state,
          rematchRequested: true
        }));
        break;

      case 'REMATCH_STARTED':
        console.log('🎮 Rematch started!');
        update(state => ({
          ...state,
          rematchRequested: false,
          rematchStarted: false,
          opponentLeft: false
        }));
        break;
    }
  });

  /**
   * ルームに参加
   */
  function joinRoom(roomId: string, playerId: PlayerId, playerName: string): void {
    websocketStore.send({
      type: 'JOIN_ROOM',
      roomId,
      playerId,
      playerName,
    });

    update(state => ({ ...state, roomId }));
  }

  function quickStart(playerId: PlayerId, playerName: string): void {
    websocketStore.send({
      type: 'QUICKSTART',
      playerId,
      playerName,
    });
  }

  /**
   * デッキを設定
   */
  function setDeck(deck: number[]): void {
    console.log('🃏 Setting deck:', deck.length, 'cards');
    websocketStore.send({
      type: 'SET_DECK',
      deck,
    });
  }

  /**
   * 準備完了
   */
  function ready(): void {
    websocketStore.send({
      type: 'READY',
    });
  }

  function requestRematch(): void {
    websocketStore.send({
      type: 'REMATCH_REQUEST'
    });
  }

  /**
   * カードを選択
   */
  function selectCard(cardId: number | null): void {
    update(state => ({ ...state, selectedCard: cardId }));
  }

  /**
   * 位置を選択
   */
  function selectPosition(position: Position | null): void {
    update(state => ({ ...state, selectedPosition: position }));
  }

  /**
   * カードを使用
   */
  function useCard(cardId: number, params: CardParams): void {
    websocketStore.send({
      type: 'USE_CARD',
      cardId,
      params,
    });

    // 選択状態をクリア
    update(state => ({
      ...state,
      selectedCard: null,
      selectedPosition: null,
    }));
  }

  /**
   * カード使用をキャンセル
   */
  function cancelCard(): void {
    websocketStore.send({
      type: 'CANCEL_CARD',
    });
  }

  /**
   * マークを配置
   */
  function placeMark(position: Position): void {
    websocketStore.send({
      type: 'PLACE_MARK',
      position,
    });

    // 選択状態をクリア
    update(state => ({
      ...state,
      selectedPosition: null,
    }));
  }

  /**
   * ターン終了（カードフェーズスキップ）
   */
  function endTurn(): void {
    websocketStore.send({
      type: 'END_TURN',
    });

    // 選択状態をクリア
    update(state => ({
      ...state,
      selectedCard: null,
      selectedPosition: null,
    }));
  }

  /**
   * ルームを退出
   */
  function leaveRoom(): void {
    websocketStore.send({
      type: 'LEAVE_ROOM',
    });

    set(initialState);
  }

  /**
   * チャットメッセージを送信
   */
  function sendChat(message: string): void {
    websocketStore.send({
      type: 'CHAT',
      message,
    });
  }

  /**
   * エラーをクリア
   */
  function clearError(): void {
    update(state => ({ ...state, error: null }));
  }

  /**
   * 状態をリセット
   */
  function reset(): void {
    set(initialState);
  }

  function clearRematchState(): void {
    update(state => ({
      ...state,
      rematchStarted: false,
      rematchRequested: false
    }));
  }

  return {
    subscribe,
    joinRoom,
    quickStart,
    setDeck,
    ready,
    selectCard,
    selectPosition,
    useCard,
    placeMark,
    endTurn,
    leaveRoom,
    sendChat,
    clearError,
    reset,
    requestRematch,
    clearRematchState,
    cancelCard,
  };
}

/**
 * ゲームストアのシングルトンインスタンス
 */
export const gameStore = createGameStore();

/**
 * 派生ストア: 自分のプレイヤー情報
 */
export const myPlayer = derived(
  gameStore,
  ($gameStore) => {
    if (!$gameStore.gameState || $gameStore.myPlayerIndex === null) {
      return null;
    }
    return $gameStore.gameState.players[$gameStore.myPlayerIndex];
  }
);

/**
 * 派生ストア: 相手のプレイヤー情報
 */
export const opponent = derived(
  gameStore,
  ($gameStore) => {
    if (!$gameStore.gameState || $gameStore.myPlayerIndex === null) {
      return null;
    }
    const opponentIndex = $gameStore.myPlayerIndex === 0 ? 1 : 0;
    return $gameStore.gameState.players[opponentIndex];
  }
);

/**
 * 派生ストア: 盤面状態
 */
export const board = derived(
  gameStore,
  ($gameStore) => $gameStore.gameState?.board || null
);

/**
 * 派生ストア: 現在のフェーズ
 */
export const currentPhase = derived(
  gameStore,
  ($gameStore) => $gameStore.gameState?.phase || 'WAITING'
);

/**
 * 派生ストア: 勝者
 */
export const winner = derived(
  gameStore,
  ($gameStore) => {
    if (!$gameStore.gameState?.winner) return null;

    const isMyWin = $gameStore.gameState.winner === $gameStore.myPlayerId;
    return {
      playerId: $gameStore.gameState.winner,
      isMyWin,
    };
  }
);

/**
 * ゲームストア使用のヘルパー
 */
export function useGameStore() {
  return gameStore;
}
