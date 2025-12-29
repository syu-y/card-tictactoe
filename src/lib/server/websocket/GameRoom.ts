import type { CardParams, PlayerId, ServerMessage } from '$lib/server/types/game.types';
import { GameStateManager } from '$lib/server/game/GameState';
import type { WebSocket } from 'ws';

/**
 * プレイヤー接続情報
 */
interface PlayerConnection {
  id: PlayerId;
  name: string;
  socket: WebSocket;
  isReady: boolean;
}

/**
 * ゲームルームクラス
 * 1つのゲームセッションを管理
 */
export class GameRoom {
  private roomId: string;
  private players: Map<PlayerId, PlayerConnection>;
  private gameState: GameStateManager | null;
  private maxPlayers: number = 2;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.players = new Map();
    this.gameState = null;
  }

  /**
   * ルームIDを取得
   */
  getRoomId(): string {
    return this.roomId;
  }

  /**
   * プレイヤーを追加
   */
  addPlayer(playerId: PlayerId, playerName: string, socket: WebSocket): boolean {
    // 既に満員の場合
    if (this.players.size >= this.maxPlayers) {
      return false;
    }

    // 既に参加している場合（再接続）
    if (this.players.has(playerId)) {
      const player = this.players.get(playerId)!;
      player.socket = socket;
      return true;
    }

    // 新規プレイヤーを追加
    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      socket,
      isReady: false,
    });

    // 2人揃ったらゲーム状態を初期化
    if (this.players.size === 2 && !this.gameState) {
      const playerIds = Array.from(this.players.keys());
      this.gameState = new GameStateManager(this.roomId, playerIds[0], playerIds[1]);
    }

    return true;
  }

  /**
   * プレイヤーを削除
   */
  removePlayer(playerId: PlayerId): void {
    this.players.delete(playerId);
  }

  /**
   * プレイヤーが存在するかチェック
   */
  hasPlayer(playerId: PlayerId): boolean {
    return this.players.has(playerId);
  }

  /**
   * プレイヤー数を取得
   */
  getPlayerCount(): number {
    return this.players.size;
  }

  /**
   * ルームが空かチェック
   */
  isEmpty(): boolean {
    return this.players.size === 0;
  }

  /**
   * ルームが満員かチェック
   */
  isFull(): boolean {
    return this.players.size >= this.maxPlayers;
  }

  /**
   * プレイヤーにメッセージを送信
   */
  sendToPlayer(playerId: PlayerId, message: ServerMessage): void {
    const player = this.players.get(playerId);
    if (player && player.socket.readyState === 1) { // WebSocket.OPEN
      player.socket.send(JSON.stringify(message));
    }
  }

  /**
   * 全プレイヤーにメッセージをブロードキャスト
   */
  broadcast(message: ServerMessage): void {
    for (const player of this.players.values()) {
      if (player.socket.readyState === 1) { // WebSocket.OPEN
        player.socket.send(JSON.stringify(message));
      }
    }
  }

  /**
   * 特定のプレイヤー以外にブロードキャスト
   */
  broadcastExcept(excludePlayerId: PlayerId, message: ServerMessage): void {
    for (const [playerId, player] of this.players.entries()) {
      if (playerId !== excludePlayerId && player.socket.readyState === 1) {
        player.socket.send(JSON.stringify(message));
      }
    }
  }

  /**
   * デッキを設定
   */
  setDeck(playerId: PlayerId, deck: number[]): boolean {
    if (!this.gameState) {
      return false;
    }

    const result = this.gameState.setDeck(playerId, deck);
    if (result.valid) {
      const player = this.players.get(playerId);
      if (player) {
        player.isReady = true;
      }
    }

    return result.valid;
  }

  /**
   * 両プレイヤーの準備が完了しているかチェック
   */
  isAllPlayersReady(): boolean {
    if (this.players.size < this.maxPlayers) {
      return false;
    }

    for (const player of this.players.values()) {
      if (!player.isReady) {
        return false;
      }
    }

    return true;
  }

  /**
   * ゲームを開始
   */
  startGame(): boolean {
    if (!this.gameState || !this.isAllPlayersReady()) {
      return false;
    }

    const result = this.gameState.startGame();
    if (result.valid) {
      // 全プレイヤーにゲーム開始を通知
      this.broadcast({ type: 'GAME_STARTED' });

      // 各プレイヤーに初期状態を送信
      this.sendGameStateToAll();

      // 最初のターン開始を通知
      const currentPlayerId = this.gameState.getCurrentPlayerId();
      this.broadcast({
        type: 'TURN_START',
        playerId: currentPlayerId,
      });
    }

    return result.valid;
  }

  /**
   * カードを使用
   */
  useCard(playerId: PlayerId, cardId: number, params: CardParams): { success: boolean; message?: string } {
    if (!this.gameState) {
      return { success: false, message: 'ゲームが開始されていません' };
    }

    const result = this.gameState.useCard(playerId, cardId, params);

    if (result.valid) {
      // カード使用を全員に通知
      const cardName = this.getCardName(cardId);
      this.broadcast({
        type: 'CARD_USED',
        playerId,
        cardId,
        cardName,
      });

      // 更新された状態を送信
      this.sendGameStateToAll();
    }

    return {
      success: result.valid,
      message: result.reason,
    };
  }

  /**
   * カードフェーズをスキップ
   */
  skipCardPhase(playerId: PlayerId): boolean {
    if (!this.gameState) {
      return false;
    }

    const result = this.gameState.skipCardPhase(playerId);

    if (result.valid) {
      this.sendGameStateToAll();
    }

    return result.valid;
  }

  /**
   * マークを配置
   */
  placeMark(playerId: PlayerId, position: { row: number; col: number }): boolean {
    if (!this.gameState) {
      return false;
    }

    const result = this.gameState.placeMark(playerId, position);

    if (result.valid) {
      // マーク配置を全員に通知
      this.broadcast({
        type: 'MARK_PLACED',
        playerId,
        position,
      });

      // 更新された状態を送信
      this.sendGameStateToAll();

      // ゲーム終了チェック
      if (this.gameState.isGameOver()) {
        const winner = this.gameState.getWinner();
        this.broadcast({
          type: 'GAME_OVER',
          winner: winner || 'draw',
          reason: winner ? 'win' : 'draw',
        });
      } else {
        // 次のターン開始を通知
        const currentPlayerId = this.gameState.getCurrentPlayerId();
        this.broadcast({
          type: 'TURN_START',
          playerId: currentPlayerId,
        });
      }
    }

    return result.valid;
  }

  /**
   * 全プレイヤーにゲーム状態を送信
   */
  private sendGameStateToAll(): void {
    if (!this.gameState) return;

    for (const playerId of this.players.keys()) {
      // 各プレイヤーに自分視点の状態を送信（相手の手札は見えない）
      const playerView = this.gameState.getPlayerView(playerId);
      this.sendToPlayer(playerId, {
        type: 'GAME_STATE',
        state: playerView,
      });
    }
  }

  /**
   * カード名を取得（デバッグ用）
   */
  private getCardName(cardId: number): string {
    // 実際にはcardDataから取得
    const cardNames: Record<number, string> = {
      1: '盤面拡張',
      2: '盤面縮小',
      3: 'プッシュ',
      4: 'スライド',
      5: 'テレポート',
      6: 'コピー',
      7: '封鎖',
      8: '二重封鎖',
      9: '逆転',
      10: '強制移動',
      11: '分断',
      12: 'ワイルド',
      13: 'ラインブレイク',
      14: '強制パス',
      15: '保護',
      16: '解除',
      17: '無効化',
      18: '1ドロー',
      19: '2ドロー',
      20: 'リロール',
      21: 'リクレイム',
      22: 'コスト軽減',
      23: 'サーチ',
      24: '予知',
      25: 'ワイルド配置',
      26: 'ライン分割',
      27: '入替',
      28: '固定化',
      29: '占拠',
    };

    return cardNames[cardId] || `カード${cardId}`;
  }

  /**
   * ゲーム状態を取得
   */
  getGameState(): GameStateManager | null {
    return this.gameState;
  }

  /**
   * デバッグ用：ルーム情報を文字列で出力
   */
  toString(): string {
    const playerList = Array.from(this.players.values())
      .map((p) => `${p.name} (${p.id}) - Ready: ${p.isReady}`)
      .join('\n  ');

    return `
=== Game Room ===
Room ID: ${this.roomId}
Players (${this.players.size}/${this.maxPlayers}):
  ${playerList}
Game Started: ${this.gameState !== null}
All Ready: ${this.isAllPlayersReady()}
`;
  }
}

/**
 * ルームマネージャークラス
 * 複数のゲームルームを管理
 */
export class RoomManager {
  private rooms: Map<string, GameRoom>;

  constructor() {
    this.rooms = new Map();
  }

  /**
   * ルームを作成
   */
  createRoom(roomId: string): GameRoom {
    const room = new GameRoom(roomId);
    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * ルームを取得（存在しない場合は作成）
   */
  getOrCreateRoom(roomId: string): GameRoom {
    if (!this.rooms.has(roomId)) {
      return this.createRoom(roomId);
    }
    return this.rooms.get(roomId)!;
  }

  /**
   * ルームを取得
   */
  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * ルームを削除
   */
  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  /**
   * 空のルームをクリーンアップ
   */
  cleanupEmptyRooms(): void {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.isEmpty()) {
        this.rooms.delete(roomId);
      }
    }
  }

  /**
   * すべてのルームIDを取得
   */
  getAllRoomIds(): string[] {
    return Array.from(this.rooms.keys());
  }

  /**
   * ルーム数を取得
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * デバッグ用：すべてのルーム情報を出力
   */
  toString(): string {
    let result = `=== Room Manager ===\nTotal Rooms: ${this.rooms.size}\n\n`;

    for (const room of this.rooms.values()) {
      result += room.toString() + '\n';
    }

    return result;
  }
}
