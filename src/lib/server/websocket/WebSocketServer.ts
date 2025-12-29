import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { ClientMessage, PlayerId } from '$lib/server/types/game.types';
import { RoomManager } from '$lib/server/websocket/GameRoom';

/**
 * WebSocket接続情報
 */
interface ConnectionInfo {
  playerId: PlayerId | null;
  roomId: string | null;
}

/**
 * ゲーム用WebSocketサーバー
 */
export class GameWebSocketServer {
  private wss: WebSocketServer;
  private roomManager: RoomManager;
  private connections: Map<WebSocket, ConnectionInfo>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.roomManager = new RoomManager();
    this.connections = new Map();

    this.setupWebSocketServer();
    this.setupCleanupInterval();
  }

  /**
   * WebSocketサーバーのセットアップ
   */
  private setupWebSocketServer(): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      console.log('New WebSocket connection');

      // 接続情報を初期化
      this.connections.set(ws, {
        playerId: null,
        roomId: null,
      });

      // メッセージ受信
      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data.toString()) as ClientMessage;
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Failed to parse message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      // 接続終了
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      // エラー処理
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  /**
   * メッセージ処理
   */
  private handleMessage(ws: WebSocket, message: ClientMessage): void {
    console.log('Received message:', message.type);

    switch (message.type) {
      case 'JOIN_ROOM':
        this.handleJoinRoom(ws, message);
        break;

      case 'SET_DECK':
        this.handleSetDeck(ws, message);
        break;

      case 'READY':
        this.handleReady(ws);
        break;

      case 'USE_CARD':
        this.handleUseCard(ws, message);
        break;

      case 'PLACE_MARK':
        this.handlePlaceMark(ws, message);
        break;

      case 'END_TURN':
        this.handleEndTurn(ws);
        break;

      case 'LEAVE_ROOM':
        this.handleLeaveRoom(ws);
        break;

      case 'CHAT':
        this.handleChat(ws, message);
        break;

      default:
        this.sendError(ws, 'Unknown message type');
    }
  }

  /**
   * ルーム参加処理
   */
  private handleJoinRoom(ws: WebSocket, message: Extract<ClientMessage, { type: 'JOIN_ROOM' }>): void {
    const { roomId, playerId, playerName } = message;

    // 既に他のルームに参加している場合は退出
    const connInfo = this.connections.get(ws);
    if (connInfo?.roomId) {
      this.handleLeaveRoom(ws);
    }

    // ルームを取得または作成
    const room = this.roomManager.getOrCreateRoom(roomId);

    // ルームが満員かチェック
    if (room.isFull() && !room.hasPlayer(playerId)) {
      this.sendError(ws, 'Room is full', 'ROOM_FULL');
      return;
    }

    // プレイヤーを追加
    const success = room.addPlayer(playerId, playerName, ws);
    if (!success) {
      this.sendError(ws, 'Failed to join room');
      return;
    }

    // 接続情報を更新
    this.connections.set(ws, {
      playerId,
      roomId,
    });

    // プレイヤーインデックスを取得
    const playerIndex = Array.from(room['players'].keys()).indexOf(playerId) as 0 | 1;

    // 参加成功を通知
    ws.send(
      JSON.stringify({
        type: 'ROOM_JOINED',
        playerId,
        playerIndex,
      })
    );

    // 相手プレイヤーに通知
    if (room.getPlayerCount() === 2) {
      const players = Array.from(room['players'].values());
      const opponent = players.find((p) => p.id !== playerId);
      if (opponent) {
        room.sendToPlayer(opponent.id, {
          type: 'OPPONENT_JOINED',
          opponentId: playerId,
          opponentName: playerName,
        });
      }
    }

    console.log(`Player ${playerId} joined room ${roomId}`);
  }

  /**
   * デッキ設定処理
   */
  private handleSetDeck(ws: WebSocket, message: Extract<ClientMessage, { type: 'SET_DECK' }>): void {
    const connInfo = this.connections.get(ws);
    if (!connInfo?.playerId || !connInfo.roomId) {
      this.sendError(ws, 'Not in a room');
      return;
    }

    const room = this.roomManager.getRoom(connInfo.roomId);
    if (!room) {
      this.sendError(ws, 'Room not found');
      return;
    }

    const success = room.setDeck(connInfo.playerId, message.deck);
    if (!success) {
      this.sendError(ws, 'Invalid deck');
      return;
    }

    console.log(`Player ${connInfo.playerId} set deck`);

    // 両プレイヤーが準備完了したらゲーム開始
    if (room.isAllPlayersReady()) {
      setTimeout(() => {
        room.startGame();
      }, 500); // 少し遅延させて確実に状態を送信
    }
  }

  /**
   * 準備完了処理
   */
  private handleReady(ws: WebSocket): void {
    const connInfo = this.connections.get(ws);
    if (!connInfo?.playerId || !connInfo.roomId) {
      this.sendError(ws, 'Not in a room');
      return;
    }

    const room = this.roomManager.getRoom(connInfo.roomId);
    if (!room) {
      this.sendError(ws, 'Room not found');
      return;
    }

    // 両プレイヤーが準備完了したらゲーム開始
    if (room.isAllPlayersReady()) {
      room.startGame();
    }
  }

  /**
   * カード使用処理
   */
  private handleUseCard(ws: WebSocket, message: Extract<ClientMessage, { type: 'USE_CARD' }>): void {
    const connInfo = this.connections.get(ws);
    if (!connInfo?.playerId || !connInfo.roomId) {
      this.sendError(ws, 'Not in a room');
      return;
    }

    const room = this.roomManager.getRoom(connInfo.roomId);
    if (!room) {
      this.sendError(ws, 'Room not found');
      return;
    }

    const result = room.useCard(connInfo.playerId, message.cardId, message.params);
    if (!result.success) {
      this.sendError(ws, result.message || 'Failed to use card');
    }
  }

  /**
   * マーク配置処理
   */
  private handlePlaceMark(ws: WebSocket, message: Extract<ClientMessage, { type: 'PLACE_MARK' }>): void {
    const connInfo = this.connections.get(ws);
    if (!connInfo?.playerId || !connInfo.roomId) {
      this.sendError(ws, 'Not in a room');
      return;
    }

    const room = this.roomManager.getRoom(connInfo.roomId);
    if (!room) {
      this.sendError(ws, 'Room not found');
      return;
    }

    const success = room.placeMark(connInfo.playerId, message.position);
    if (!success) {
      this.sendError(ws, 'Failed to place mark');
    }
  }

  /**
   * ターン終了処理（カードフェーズスキップ）
   */
  private handleEndTurn(ws: WebSocket): void {
    const connInfo = this.connections.get(ws);
    if (!connInfo?.playerId || !connInfo.roomId) {
      this.sendError(ws, 'Not in a room');
      return;
    }

    const room = this.roomManager.getRoom(connInfo.roomId);
    if (!room) {
      this.sendError(ws, 'Room not found');
      return;
    }

    const success = room.skipCardPhase(connInfo.playerId);
    if (!success) {
      this.sendError(ws, 'Failed to end turn');
    }
  }

  /**
   * ルーム退出処理
   */
  private handleLeaveRoom(ws: WebSocket): void {
    const connInfo = this.connections.get(ws);
    if (!connInfo?.roomId) {
      return;
    }

    const room = this.roomManager.getRoom(connInfo.roomId);
    if (room && connInfo.playerId) {
      // 相手に通知
      room.broadcastExcept(connInfo.playerId, {
        type: 'OPPONENT_LEFT',
      });

      // プレイヤーを削除
      room.removePlayer(connInfo.playerId);

      console.log(`Player ${connInfo.playerId} left room ${connInfo.roomId}`);

      // ルームが空になったら削除
      if (room.isEmpty()) {
        this.roomManager.deleteRoom(connInfo.roomId);
        console.log(`Room ${connInfo.roomId} deleted`);
      }
    }

    // 接続情報をクリア
    this.connections.set(ws, {
      playerId: null,
      roomId: null,
    });
  }

  /**
   * チャット処理
   */
  private handleChat(ws: WebSocket, message: Extract<ClientMessage, { type: 'CHAT' }>): void {
    const connInfo = this.connections.get(ws);
    if (!connInfo?.playerId || !connInfo.roomId) {
      this.sendError(ws, 'Not in a room');
      return;
    }

    const room = this.roomManager.getRoom(connInfo.roomId);
    if (!room) {
      this.sendError(ws, 'Room not found');
      return;
    }

    // 全員にチャットメッセージをブロードキャスト
    room.broadcast({
      type: 'CHAT',
      playerId: connInfo.playerId,
      message: message.message,
    });
  }

  /**
   * 接続切断処理
   */
  private handleDisconnect(ws: WebSocket): void {
    console.log('WebSocket disconnected');
    this.handleLeaveRoom(ws);
    this.connections.delete(ws);
  }

  /**
   * エラーメッセージを送信
   */
  private sendError(ws: WebSocket, message: string, code?: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          message,
          code,
        })
      );
    }
  }

  /**
   * 定期的に空のルームをクリーンアップ
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      this.roomManager.cleanupEmptyRooms();
    }, 60000); // 1分ごと
  }

  /**
   * サーバーを停止
   */
  close(): void {
    this.wss.close();
  }

  /**
   * デバッグ用：サーバー状態を取得
   */
  getStatus(): {
    connections: number;
    rooms: number;
    roomDetails: string;
  } {
    return {
      connections: this.connections.size,
      rooms: this.roomManager.getRoomCount(),
      roomDetails: this.roomManager.toString(),
    };
  }
}
