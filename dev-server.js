// dev-server.js
import { createServer } from 'vite';
import { WebSocketServer } from 'ws';

const vite = await createServer({
  // server: { port: 5173 },
  server: { 
    port: PORT,
    host: '0.0.0.0'
  },
  configFile: './vite.config.ts'
});

await vite.listen();

// Viteのモジュールローダーを取得
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { moduleGraph, ssrLoadModule } = vite;

// ゲーム用WebSocketサーバーを別ポートで起動
const wss = new WebSocketServer({ 
  // port: 3001 
  port: WS_PORT,
  host: '0.0.0.0'
});

// console.log('✅ Vite dev server running on http://localhost:5173');
// console.log('✅ WebSocket server running on ws://localhost:3001');
console.log(`✅ Vite dev server running on http://0.0.0.0:${PORT}`);
console.log(`✅ WebSocket server running on ws://0.0.0.0:${WS_PORT}`);

// ルーム管理
const rooms = new Map();

// マッチングキュー
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const matchmakingQueue = [];

// マッチメイキング処理
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function tryMatchmaking() {
  while (matchmakingQueue.length >= 2) {
    const player1 = matchmakingQueue.shift();
    const player2 = matchmakingQueue.shift();
    
    // 新しいルームを作成
    const roomId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🎮 Match found! Creating room ${roomId} for ${player1.playerId} and ${player2.playerId}`);
    
    // 両プレイヤーにルームIDを通知
    player1.ws.send(JSON.stringify({
      type: 'MATCH_FOUND',
      roomId: roomId,
      playerIndex: 0
    }));
    
    player2.ws.send(JSON.stringify({
      type: 'MATCH_FOUND',
      roomId: roomId,
      playerIndex: 1
    }));
    
    // ルームを作成
    rooms.set(roomId, {
      players: [],
      gameState: null
    });
  }
}

wss.on('connection', (ws) => {
  console.log('✅ WebSocket connected');
  
  let clientRoomId = null;
  let clientPlayerId = null;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨', message.type);

      if (message.type === 'QUICKSTART') {
        clientPlayerId = message.playerId;
        
        console.log(`🎲 Player ${clientPlayerId} joined matchmaking queue`);
        
        // キューに追加
        matchmakingQueue.push({
          ws,
          playerId: clientPlayerId,
          playerName: message.playerName
        });
        
        // マッチング試行
        tryMatchmaking();
      }
      else if (message.type === 'JOIN_ROOM') {
        clientRoomId = message.roomId;
        clientPlayerId = message.playerId;
        
        if (!rooms.has(clientRoomId)) {
          rooms.set(clientRoomId, { players: [], gameState: null });
        }
        
        const room = rooms.get(clientRoomId);
        
        if (room.players.length >= 2) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full' }));
          return;
        }
        
        room.players.push({ ws, playerId: clientPlayerId, playerName: message.playerName, deck: null });
        
        ws.send(JSON.stringify({
          type: 'ROOM_JOINED',
          playerId: clientPlayerId,
          playerIndex: room.players.length - 1
        }));

        if (room.players.length === 2) {
          room.players.forEach(p => {
            if (p.playerId !== clientPlayerId) {
              p.ws.send(JSON.stringify({
                type: 'OPPONENT_JOINED',
                opponentId: clientPlayerId,
                opponentName: message.playerName
              }));
            }
          });
        }
      }
      else if (message.type === 'SET_DECK') {
        if (!clientRoomId || !rooms.has(clientRoomId)) return;
        
        const room = rooms.get(clientRoomId);
        const player = room.players.find(p => p.playerId === clientPlayerId);
        if (player) player.deck = message.deck;

        const allReady = room.players.length === 2 && room.players.every(p => p.deck);
        
        if (allReady) {
          console.log('🎮 Starting game...');
          
          // ViteのSSRローダーを使用してモジュールをロード
          const gameStateModule = await ssrLoadModule('/src/lib/server/game/GameState.ts');
          const { GameStateManager } = gameStateModule;
          
          const gameManager = new GameStateManager(
            clientRoomId,
            room.players[0].playerId,
            room.players[1].playerId
          );

          room.players.forEach(p => gameManager.setDeck(p.playerId, p.deck));
          gameManager.startGame();
          room.gameState = gameManager;

          room.players.forEach(p => p.ws.send(JSON.stringify({ type: 'GAME_STARTED' })));

          setTimeout(() => {
            room.players.forEach((p, index) => {
              const state = gameManager.getPlayerView(p.playerId);
              console.log(`Sending state to player ${index}:`, {
                playerId: p.playerId,
                hand: state.players[index].hand,
                opponentHand: state.players[index === 0 ? 1 : 0].hand
              });
              p.ws.send(JSON.stringify({ type: 'GAME_STATE', state }));
            });

            room.players.forEach(p => {
              p.ws.send(JSON.stringify({
                type: 'TURN_START',
                playerId: room.players[0].playerId
              }));
            });
          }, 500);
        }
      }
      else if (message.type === 'USE_CARD') {
        if (!clientRoomId || !rooms.has(clientRoomId)) return;
        
        const room = rooms.get(clientRoomId);
        if (!room.gameState) return;

        const result = room.gameState.useCard(clientPlayerId, message.cardId, message.params);
        
        if (result.valid) {
          room.players.forEach(p => {
            p.ws.send(JSON.stringify({
              type: 'CARD_USED',
              playerId: clientPlayerId,
              cardId: message.cardId,
              cardName: `Card ${message.cardId}`
            }));

            const state = room.gameState.getPlayerView(p.playerId);
            p.ws.send(JSON.stringify({ type: 'GAME_STATE', state }));
          });
        } else {
          ws.send(JSON.stringify({ type: 'ERROR', message: result.reason }));
        }
      }
      else if (message.type === 'PLACE_MARK') {
        if (!clientRoomId || !rooms.has(clientRoomId)) return;
        
        const room = rooms.get(clientRoomId);
        if (!room.gameState) return;

        const result = room.gameState.placeMark(clientPlayerId, message.position);
        
        if (result.valid) {
          // 強制パスなどのメッセージがある場合は通知
          if (result.reason) {
            room.players.forEach(p => {
              p.ws.send(JSON.stringify({
                type: 'INFO',
                message: result.reason
              }));
            });
          }

          room.players.forEach(p => {
            p.ws.send(JSON.stringify({
              type: 'MARK_PLACED',
              playerId: clientPlayerId,
              position: message.position
            }));

            const state = room.gameState.getPlayerView(p.playerId);
            p.ws.send(JSON.stringify({ type: 'GAME_STATE', state }));
          });

          if (room.gameState.isGameOver()) {
            const winner = room.gameState.getWinner();
            room.players.forEach(p => {
              p.ws.send(JSON.stringify({
                type: 'GAME_OVER',
                winner: winner || 'draw',
                reason: winner ? 'win' : 'draw'
              }));
            });
          } else {
            const nextPlayerId = room.gameState.getCurrentPlayerId();
            room.players.forEach(p => {
              p.ws.send(JSON.stringify({
                type: 'TURN_START',
                playerId: nextPlayerId
              }));
            });
          }
        } else {
          ws.send(JSON.stringify({ type: 'ERROR', message: result.reason }));
        }
      }
      else if (message.type === 'END_TURN') {
        if (!clientRoomId || !rooms.has(clientRoomId)) return;
        
        const room = rooms.get(clientRoomId);
        if (!room.gameState) return;

        const result = room.gameState.skipCardPhase(clientPlayerId);
        
        if (result.valid) {
          room.players.forEach(p => {
            const state = room.gameState.getPlayerView(p.playerId);
            p.ws.send(JSON.stringify({ type: 'GAME_STATE', state }));
          });
        }
      }
      else if (message.type === 'LEAVE_ROOM') {
        console.log(`👋 Player ${clientPlayerId} leaving room ${clientRoomId}`);
        
        if (clientRoomId && rooms.has(clientRoomId)) {
          const room = rooms.get(clientRoomId);
          
          // 他のプレイヤーに通知
          room.players.forEach(p => {
            if (p.playerId !== clientPlayerId) {
              p.ws.send(JSON.stringify({ type: 'OPPONENT_LEFT' }));
            }
          });
          
          // ルームから削除
          room.players = room.players.filter(p => p.playerId !== clientPlayerId);
          
          // ルームが空になったら削除
          if (room.players.length === 0) {
            rooms.delete(clientRoomId);
            console.log(`🗑️ Room ${clientRoomId} deleted (empty)`);
          }
          
          // クライアント変数をクリア
          clientRoomId = null;
          clientPlayerId = null;
        }
      }
      else if (message.type === 'REMATCH_REQUEST') {
        console.log(`🔄 Player ${clientPlayerId} requested rematch in room ${clientRoomId}`);
        
        if (!clientRoomId || !rooms.has(clientRoomId)) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'ルームが見つかりません' }));
          return;
        }
        
        const room = rooms.get(clientRoomId);
        
        // 相手に再戦リクエストを通知
        room.players.forEach(p => {
          if (p.playerId !== clientPlayerId) {
            p.ws.send(JSON.stringify({ 
              type: 'REMATCH_REQUESTED',
              playerId: clientPlayerId
            }));
          }
        });
        
        // 再戦リクエストを記録
        if (!room.rematchRequests) {
          room.rematchRequests = new Set();
        }
        room.rematchRequests.add(clientPlayerId);
        
        // 両プレイヤーが再戦希望なら、ゲームをリセット
        if (room.rematchRequests.size === 2) {
          console.log(`🎮 Both players agreed to rematch in room ${clientRoomId}`);
          
          // ViteのSSRローダーを使用してモジュールをロード
          const gameStateModule = await ssrLoadModule('/src/lib/server/game/GameState.ts');
          const { GameStateManager } = gameStateModule;
          
          const gameManager = new GameStateManager(
            clientRoomId,
            room.players[0].playerId,
            room.players[1].playerId
          );

          room.players.forEach(p => gameManager.setDeck(p.playerId, p.deck));
          gameManager.startGame();
          room.gameState = gameManager;
          room.rematchRequests.clear();
          room.players.forEach(p => p.ws.send(JSON.stringify({ type: 'GAME_STARTED' })));

          setTimeout(() => {
            room.players.forEach((p, index) => {
              const state = gameManager.getPlayerView(p.playerId);
              console.log(`Sending state to player ${index}:`, {
                playerId: p.playerId,
                hand: state.players[index].hand,
                opponentHand: state.players[index === 0 ? 1 : 0].hand
              });
              p.ws.send(JSON.stringify({ type: 'GAME_STATE', state }));
            });

            room.players.forEach(p => {
              p.ws.send(JSON.stringify({
                type: 'TURN_START',
                playerId: room.players[0].playerId
              }));
            });
          }, 500);
        }
      }
    } catch (error) {
      console.error('❌ WebSocket error:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket disconnected');
    
    if (clientRoomId && rooms.has(clientRoomId)) {
      const room = rooms.get(clientRoomId);
      room.players = room.players.filter(p => p.playerId !== clientPlayerId);
      
      if (room.players.length === 0) {
        rooms.delete(clientRoomId);
      } else {
        room.players.forEach(p => {
          p.ws.send(JSON.stringify({ type: 'OPPONENT_LEFT' }));
        });
      }
    }
  });
});
