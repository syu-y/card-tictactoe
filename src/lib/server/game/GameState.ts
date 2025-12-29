import type {
  GameState,
  PlayerState,
  PlayerId,
  Position,
  CardParams,
  ValidationResult,
} from '$lib/server/types/game.types';
import { DECK_CONSTRAINTS } from '$lib/server/types/game.types';
import { Board } from '$lib/server/game/Board';
import { WinChecker } from '$lib/server/game/WinChecker';
import { CardEffects } from '$lib/server/game/CardEffects';
import { getCard } from '$lib/utils/cardData';

/**
 * ゲーム状態管理クラス
 */
export class GameStateManager {
  private state: GameState;

  constructor(roomId: string, player1Id: PlayerId, player2Id: PlayerId) {
    this.state = this.createInitialState(roomId, player1Id, player2Id);
  }

  /**
   * 初期ゲーム状態を作成
   */
  private createInitialState(roomId: string, player1Id: PlayerId, player2Id: PlayerId): GameState {
    const board = new Board();

    return {
      roomId,
      phase: 'DECK_SELECT',
      board: board.getState(),
      players: [
        this.createPlayer(player1Id, 'O'),
        this.createPlayer(player2Id, 'X'),
      ],
      currentPlayer: 0,
      turnCount: 1,
      lineBreakT: 0,
      cardUsedThisTurn: false,
    };
  }

  /**
   * プレイヤー状態を作成
   */
  private createPlayer(id: PlayerId, mark: 'O' | 'X'): PlayerState {
    return {
      id,
      mark,
      deck: [],
      hand: [],
      discardPile: [],
      skipNextPlace: false,
      ignoreCardLimit: false,
      noMoreCardThisTurn: false,
    };
  }

  /**
   * 現在の状態を取得
   */
  getState(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * 状態を設定
   */
  setState(state: GameState): void {
    this.state = JSON.parse(JSON.stringify(state));
  }

  /**
   * デッキを設定
   */
  setDeck(playerId: PlayerId, deck: number[]): ValidationResult {
    const playerIndex = this.getPlayerIndex(playerId);
    if (playerIndex === -1) {
      return { valid: false, reason: 'プレイヤーが見つかりません' };
    }

    if (deck.length !== DECK_CONSTRAINTS.DECK_SIZE) {
      return { valid: false, reason: `デッキは${DECK_CONSTRAINTS.DECK_SIZE}枚である必要があります` };
    }

    // カード枚数制限のチェック
    const cardCounts = new Map<number, number>();
    for (const cardId of deck) {
      cardCounts.set(cardId, (cardCounts.get(cardId) || 0) + 1);
    }

    // 各カードの枚数制限をチェック
    for (const [cardId, count] of cardCounts.entries()) {
      const card = getCard(cardId);
      if (!card) {
        return { valid: false, reason: `無効なカードID: ${cardId}` };
      }

      // 妨害カードは1枚まで
      if (card.category === '妨害' && count > 1) {
        return { valid: false, reason: `${card.name}は1枚までしか入れられません（妨害カード制限）` };
      }

      // その他のカードは2枚まで
      if (card.category !== '妨害' && count > 2) {
        return { valid: false, reason: `${card.name}は2枚までしか入れられません` };
      }
    }

    // デッキをシャッフル
    const shuffledDeck = this.shuffleArray([...deck]);
    this.state.players[playerIndex].deck = shuffledDeck;

    return { valid: true };
  }

  /**
   * ゲームを開始
   */
  startGame(): ValidationResult {
    // 両プレイヤーがデッキを設定しているかチェック
    for (const player of this.state.players) {
      if (player.deck.length !== DECK_CONSTRAINTS.DECK_SIZE) {
        return { valid: false, reason: '両プレイヤーがデッキを設定する必要があります' };
      }
    }

    // 初期手札を配る
    for (const player of this.state.players) {
      for (let i = 0; i < DECK_CONSTRAINTS.INITIAL_HAND_SIZE; i++) {
        if (player.deck.length > 0) {
          player.hand.push(player.deck.shift()!);
        }
      }
    }

    this.state.phase = 'CARD';
    return { valid: true };
  }

  /**
   * カードを使用
   */
  useCard(playerId: PlayerId, cardId: number, params: CardParams): ValidationResult {
    const playerIndex = this.getPlayerIndex(playerId);
    if (playerIndex === -1) {
      return { valid: false, reason: 'プレイヤーが見つかりません' };
    }

    // 現在のプレイヤーかチェック
    if (this.state.currentPlayer !== playerIndex) {
      return { valid: false, reason: '自分のターンではありません' };
    }

    // カードフェーズかチェック
    if (this.state.phase !== 'CARD') {
      return { valid: false, reason: 'カード使用フェーズではありません' };
    }

    const player = this.state.players[playerIndex];

    // 手札にカードがあるかチェック
    const cardIndex = player.hand.indexOf(cardId);
    if (cardIndex === -1) {
      return { valid: false, reason: '手札にそのカードがありません' };
    }

    // カード使用制限チェック
    if (!player.ignoreCardLimit) {
      if (this.state.cardUsedThisTurn) {
        return { valid: false, reason: 'このターンは既にカードを使用しています' };
      }

      if (player.noMoreCardThisTurn) {
        return { valid: false, reason: 'このターンはもうカードを使用できません' };
      }
    }

    // マルチステップカードの処理チェック
    const card = getCard(cardId);
    if (card?.isMultiStep && !player.pendingCardAction) {
      // 最初のステップ - カードを手札から削除しない
    } else if (cardId === 20 || cardId === 21) {
      // リロール、リクレイム - 効果適用後に削除
      // 何もしない（後で削除）
    } else {
      // 通常のカードまたは2ステップ目 - カードを手札から削除
      player.hand.splice(cardIndex, 1);
      player.discardPile.push(cardId);
    }

    // カード効果を適用
    const result = CardEffects.applyCardEffect(this.state, playerIndex, cardId, params);

    if (!result.success) {
      // 失敗した場合、カードを手札に戻す（マルチステップでなければ）
      // リロール・リクレイムは元々手札から削除していないので何もしない
      if (!player.pendingCardAction && cardId !== 20 && cardId !== 21) {
        player.discardPile.pop();
        player.hand.splice(cardIndex, 0, cardId);
      }
      return { valid: false, reason: result.message };
    }

    // リロールカードの場合、ここで削除
    if (cardId === 20) {
      const currentCardIndex = player.hand.indexOf(cardId);
      if (currentCardIndex !== -1) {
        player.hand.splice(currentCardIndex, 1);
        player.discardPile.push(cardId);
      }
    }

    // リクレイムカードの場合、ここで削除
    if (cardId === 21) {
      const currentCardIndex = player.hand.indexOf(cardId);
      if (currentCardIndex !== -1) {
        player.hand.splice(currentCardIndex, 1);
        player.discardPile.push(cardId);
      }
    }

    // カード使用フラグを立てる（マルチステップの最初のステップでは立てない）
    if (!player.pendingCardAction) {
      this.state.cardUsedThisTurn = true;
    }

    // カード効果適用後に勝利チェック
    const winResult = WinChecker.checkWin(this.state.board);
    console.log('🔍 Win check after card use:', winResult);
    if (winResult.winner !== null) {
      // Markをプレイヤーインデックスに変換してから、PlayerIdを取得
      const winnerIndex = winResult.winner === 'O' ? 0 : 1;
      const winnerPlayerId = this.state.players[winnerIndex].id;
      this.state.winner = winnerPlayerId;
      this.state.phase = 'GAME_OVER';
      console.log(`🎉 Game Over! Winner: ${winnerPlayerId} (${winResult.winner})`);
      return { valid: true };
    }

    // カード使用成功後、配置フェーズに移行
    // マルチステップカードの第1段階の場合はカードフェーズを継続
    if (!player.pendingCardAction) {
      this.state.phase = 'PLACE';
    }
    return { valid: true };
  }

  /**
   * カードフェーズをスキップ
   */
  skipCardPhase(playerId: PlayerId): ValidationResult {
    const playerIndex = this.getPlayerIndex(playerId);
    if (playerIndex === -1) {
      return { valid: false, reason: 'プレイヤーが見つかりません' };
    }

    if (this.state.currentPlayer !== playerIndex) {
      return { valid: false, reason: '自分のターンではありません' };
    }

    if (this.state.phase !== 'CARD') {
      return { valid: false, reason: 'カードフェーズではありません' };
    }

    // 配置フェーズへ移行
    this.state.phase = 'PLACE';

    return { valid: true };
  }

  /**
   * マークを配置
   */
  placeMark(playerId: PlayerId, position: Position): ValidationResult {
    const playerIndex = this.getPlayerIndex(playerId);
    if (playerIndex === -1) {
      return { valid: false, reason: 'プレイヤーが見つかりません' };
    }

    if (this.state.currentPlayer !== playerIndex) {
      return { valid: false, reason: '自分のターンではありません' };
    }

    if (this.state.phase !== 'PLACE') {
      return { valid: false, reason: '配置フェーズではありません' };
    }

    const player = this.state.players[playerIndex];

    // 強制パスチェック
    if (player.skipNextPlace) {
      player.skipNextPlace = false;

      // ターン終了処理を実行
      this.endTurn();

      // 成功として返す（配置はスキップされたがターンは正常に終了）
      return { valid: true, reason: '強制パスにより配置がスキップされました' };
    }

    // 盤面にマークを配置
    const board = new Board();
    board.setState(this.state.board);

    const result = board.placeMark(position, player.mark);
    if (!result.valid) {
      return result;
    }

    this.state.board = board.getState();

    // 勝利判定
    const gameOverResult = this.checkGameOver();
    if (gameOverResult.isOver) {
      this.state.phase = 'GAME_OVER';
      this.state.winner = gameOverResult.winner;
      this.state.winningLine = gameOverResult.line?.positions;
      return { valid: true };
    }

    // ターン終了
    this.endTurn();

    return { valid: true };
  }

  /**
   * ターン終了処理
   */
  private endTurn(): void {
    const currentPlayer = this.state.players[this.state.currentPlayer];

    // ターン終了時の状態をリセット
    currentPlayer.noMoreCardThisTurn = false;
    currentPlayer.ignoreCardLimit = false;
    this.state.cardUsedThisTurn = false;

    // 盤面の状態異常タイマーをデクリメント
    const board = new Board();
    board.setState(this.state.board);
    board.decrementTimers();
    this.state.board = board.getState();

    // ラインブレイクをデクリメント
    if (this.state.lineBreakT > 0) {
      this.state.lineBreakT--;
    }

    // 次のプレイヤーへ
    this.state.currentPlayer = this.state.currentPlayer === 0 ? 1 : 0;
    this.state.turnCount++;

    // 次のプレイヤーのカードドロー（1ターン目の先攻を除く）
    if (!(this.state.turnCount === 1 && this.state.currentPlayer === 0)) {
      const nextPlayer = this.state.players[this.state.currentPlayer];
      if (nextPlayer.deck.length > 0) {
        const drawnCard = nextPlayer.deck.shift()!;
        if (nextPlayer.hand.length < DECK_CONSTRAINTS.MAX_HAND_SIZE) {
          nextPlayer.hand.push(drawnCard);
        } else {
          nextPlayer.discardPile.push(drawnCard);
        }
      }
    }

    // カードフェーズへ
    this.state.phase = 'CARD';
  }

  /**
   * 勝利判定
   */
  private checkGameOver(): {
    isOver: boolean;
    winner: PlayerId | null;
    line: { positions: Position[]; type: string } | null;
  } {
    // ラインブレイクが有効な場合、勝利判定をスキップ
    if (this.state.lineBreakT > 0) {
      this.state.lineBreakT--;
      return { isOver: false, winner: null, line: null };
    }

    const result = WinChecker.checkGameOver(this.state.board);

    if (result.isOver) {
      let winnerId: PlayerId | null = null;
      if (result.winner) {
        const winnerIndex = this.state.players.findIndex((p) => p.mark === result.winner);
        if (winnerIndex !== -1) {
          winnerId = this.state.players[winnerIndex].id;
        }
      }

      return {
        isOver: true,
        winner: winnerId,
        line: result.line,
      };
    }

    return { isOver: false, winner: null, line: null };
  }

  /**
   * プレイヤーインデックスを取得
   */
  private getPlayerIndex(playerId: PlayerId): 0 | 1 | -1 {
    for (let i = 0; i < this.state.players.length; i++) {
      if (this.state.players[i].id === playerId) {
        return i as 0 | 1;
      }
    }
    return -1;
  }

  /**
   * 配列をシャッフル（Fisher-Yates）
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * 現在のプレイヤーIDを取得
   */
  getCurrentPlayerId(): PlayerId {
    return this.state.players[this.state.currentPlayer].id;
  }

  /**
   * プレイヤー情報を取得（手札などは自分のもののみ見える）
   */
  getPlayerView(playerId: PlayerId): GameState {
    const state = this.getState();
    const playerIndex = this.getPlayerIndex(playerId);

    if (playerIndex === -1) {
      return state; // プレイヤーが見つからない場合はそのまま返す
    }

    // 相手の手札とデッキを隠す
    const opponentIndex = playerIndex === 0 ? 1 : 0;

    // 相手の手札を0で埋める（枚数は分かるが中身は見えない）
    state.players[opponentIndex].hand = state.players[opponentIndex].hand.map(() => 0);
    state.players[opponentIndex].deck = state.players[opponentIndex].deck.map(() => 0);

    // pendingCardActionの候補も隠す
    if (state.players[opponentIndex].pendingCardAction) {
      state.players[opponentIndex].pendingCardAction!.candidates = [];
    }

    return state;
  }

  /**
   * ゲームが終了しているかチェック
   */
  isGameOver(): boolean {
    return this.state.phase === 'GAME_OVER';
  }

  /**
   * 勝者を取得
   */
  getWinner(): PlayerId | null {
    return this.state.winner || null;
  }

  /**
   * デバッグ用：状態を文字列で出力
   */
  toString(): string {
    const board = new Board();
    board.setState(this.state.board);

    return `
=== Game State ===
Room: ${this.state.roomId}
Phase: ${this.state.phase}
Turn: ${this.state.turnCount}
Current Player: ${this.state.players[this.state.currentPlayer].id} (${this.state.players[this.state.currentPlayer].mark})

${WinChecker.boardToString(this.state.board)}

Player 1 (${this.state.players[0].mark}): ${this.state.players[0].id}
  Hand: ${this.state.players[0].hand.length} cards
  Deck: ${this.state.players[0].deck.length} cards
  Discard: ${this.state.players[0].discardPile.length} cards

Player 2 (${this.state.players[1].mark}): ${this.state.players[1].id}
  Hand: ${this.state.players[1].hand.length} cards
  Deck: ${this.state.players[1].deck.length} cards
  Discard: ${this.state.players[1].discardPile.length} cards
`;
  }
}
