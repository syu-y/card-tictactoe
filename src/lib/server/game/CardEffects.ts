import type {
  GameState,
  PlayerState,
  CardParams,
  CardEffectResult,
  CellState
} from '../types/game.types';
import { Board } from '$lib/server/game/Board';
import { getCard } from '$lib/utils/cardData';
import { DECK_CONSTRAINTS } from '$lib/server/types/game.types';

/**
 * カード効果を適用するクラス
 */
export class CardEffects {
  /**
   * カード効果を適用
   */
  static applyCardEffect(
    gameState: GameState,
    playerIndex: 0 | 1,
    cardId: number,
    params: CardParams
  ): CardEffectResult {
    const card = getCard(cardId);
    if (!card) {
      return { success: false, message: '無効なカードIDです' };
    }

    const board = new Board();
    board.setState(gameState.board);
    const player = gameState.players[playerIndex];
    const opponent = gameState.players[playerIndex === 0 ? 1 : 0];

    // カードIDに応じて効果を適用
    let result: CardEffectResult;

    switch (cardId) {
      case 1: // 盤面拡張
        result = this.expandBoard(board, params);
        break;
      case 2: // 盤面縮小
        result = this.shrinkBoard(board, params);
        break;
      case 3: // プッシュ
        result = this.pushBoard(board, params);
        break;
      case 4: // スライド
        result = this.slide(board, player, params);
        break;
      case 5: // テレポート
        result = this.teleport(board, player, params);
        break;
      case 6: // コピー
        result = this.copy(board, player, params);
        break;
      case 7: // 封鎖
        result = this.lock(board, params, 2);
        break;
      case 8: // 二重封鎖
        result = this.lock(board, params, 4);
        break;
      case 9: // 逆転
        result = this.flip(board, params, playerIndex);
        break;
      case 10: // 強制移動
        result = this.forceMove(board, opponent, params, playerIndex);
        break;
      case 11: // 分断
        result = this.disrupt(board, params, 2);
        break;
      case 12: // ワイルド
        result = this.wild(board, params, 1);
        break;
      case 13: // ラインブレイク
        result = this.lineBreak(gameState);
        break;
      case 14: // 強制パス
        result = this.forcePass(opponent);
        break;
      case 15: // 保護
        result = this.protect(board, params, 2);
        break;
      case 16: // 解除
        result = this.dispel(board, params);
        break;
      case 17: // 無効化
        result = this.nullify(board, params);
        break;
      case 18: // 1ドロー
        result = this.draw(player, 1);
        break;
      case 19: // 2ドロー
        result = this.draw(player, 2);
        // if (result.success) {
        //   player.noMoreCardThisTurn = true;
        // }
        break;
      case 20: // リロール
        result = this.reroll(player, params);
        break;
      case 21: // リクレイム
        result = this.reclaim(player);
        break;
      case 22: // コスト軽減
        result = this.costReduction(player);
        break;
      case 23: // サーチ
        result = this.search(player, params);
        break;
      case 24: // 予知
        result = this.predict(player, params);
        break;
      case 25: // ワイルド配置
        result = this.wild(board, params, 1);
        break;
      case 26: // ライン分割
        result = this.disrupt(board, params, 2);
        break;
      case 27: // 入替
        result = this.swap(board, params, playerIndex);
        break;
      case 28: // 固定化
        result = this.protect(board, params, 2);
        break;
      case 29: { // 占拠 
        result = this.occupy(board, params, 2, playerIndex);
        break;
      }
      default:
        return { success: false, message: '未実装のカードです' };
    }

    // 成功した場合、盤面を更新
    if (result.success && result.boardChanged) {
      gameState.board = board.getState();
    }

    return result;
  }

  // ============================================
  // 盤面操作カード
  // ============================================

  private static expandBoard(board: Board, params: CardParams): CardEffectResult {
    if (!params.rowCol || !params.direction) {
      return { success: false, message: 'rowColとdirectionが必要です' };
    }

    const validation = board.expand(params.rowCol, params.direction);
    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  private static shrinkBoard(board: Board, params: CardParams): CardEffectResult {
    if (!params.rowCol || !params.direction) {
      return { success: false, message: 'rowColとdirectionが必要です' };
    }

    const validation = board.shrink(params.rowCol, params.direction);
    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  private static pushBoard(board: Board, params: CardParams): CardEffectResult {
    if (!params.rowCol || !params.rowOrCol || !params.direction) {
      console.log(params)
      return { success: false, message: 'rowCol、rowOrCol、directionが必要です' };
    }

    const validation = board.push(params.rowCol, params.rowOrCol, params.direction);
    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  private static slide(board: Board, player: PlayerState, params: CardParams): CardEffectResult {
    if (!params.fromPosition || !params.toPosition) {
      return { success: false, message: 'fromPositionとtoPositionが必要です' };
    }

    // 移動元が自分のマークかチェック
    const fromCell = board.getCell(params.fromPosition);
    if (!fromCell || fromCell.mark !== player.mark) {
      return { success: false, message: '移動元は自分のマークである必要があります' };
    }

    const validation = board.moveMark(params.fromPosition, params.toPosition, true);
    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  private static teleport(board: Board, player: PlayerState, params: CardParams): CardEffectResult {
    if (!params.fromPosition || !params.toPosition) {
      return { success: false, message: 'fromPositionとtoPositionが必要です' };
    }

    // 移動元が自分のマークかチェック
    const fromCell = board.getCell(params.fromPosition);
    if (!fromCell || fromCell.mark !== player.mark) {
      return { success: false, message: '移動元は自分のマークである必要があります' };
    }

    const validation = board.moveMark(params.fromPosition, params.toPosition, false);
    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  private static copy(board: Board, player: PlayerState, params: CardParams): CardEffectResult {
    if (!params.fromPosition || !params.toPosition) {
      return { success: false, message: 'fromPositionとtoPositionが必要です' };
    }

    // コピー元が自分のマークかチェック
    const fromCell = board.getCell(params.fromPosition);
    if (!fromCell || fromCell.mark !== player.mark) {
      return { success: false, message: 'コピー元は自分のマークである必要があります' };
    }

    const validation = board.copyMark(params.fromPosition, params.toPosition);
    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  // ============================================
  // 妨害カード
  // ============================================

  private static lock(board: Board, params: CardParams, duration: number): CardEffectResult {
    if (!params.position) {
      return { success: false, message: 'positionが必要です' };
    }

    const cell = board.getCell(params.position);
    if (!cell) {
      return { success: false, message: '無効な位置です' };
    }

    if (cell.protectT > 0) {
      return { success: false, message: '保護されているマスには使用できません' };
    }

    const validation = board.setCellState(params.position, { lockT: duration });
    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  private static flip(board: Board, params: CardParams, playerIndex: number): CardEffectResult {
    if (!params.position) {
      return { success: false, message: 'positionが必要です' };
    }

    const validation = board.flipMark(params.position, playerIndex);
    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  private static forceMove(
    board: Board,
    opponent: PlayerState,
    params: CardParams,
    playerIndex: number
  ): CardEffectResult {
    if (!params.fromPosition || !params.toPosition) {
      return { success: false, message: 'fromPositionとtoPositionが必要です' };
    }

    // 移動元が相手のマークかチェック
    const fromCell = board.getCell(params.fromPosition);
    if (!fromCell || fromCell.mark !== opponent.mark) {
      return { success: false, message: '移動元は相手のマークである必要があります' };
    }

    // 占拠チェック
    if (fromCell.occupyT > 0 && fromCell.occupyOwner !== undefined && fromCell.occupyOwner !== playerIndex) {
      return { success: false, message: 'このマスは相手に占拠されています' };
    }

    const validation = board.moveMark(params.fromPosition, params.toPosition, true);
    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  private static disrupt(board: Board, params: CardParams, duration: number): CardEffectResult {
    if (!params.position) {
      return { success: false, message: 'positionが必要です' };
    }

    const cell = board.getCell(params.position);
    if (!cell) {
      return { success: false, message: '無効な位置です' };
    }

    if (cell.protectT > 0) {
      return { success: false, message: '保護されているマスには使用できません' };
    }

    const validation = board.setCellState(params.position, { noLineT: duration });
    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  private static wild(board: Board, params: CardParams, duration: number): CardEffectResult {
    if (!params.position) {
      return { success: false, message: 'positionが必要です' };
    }

    const cell = board.getCell(params.position);
    if (!cell) {
      return { success: false, message: '無効な位置です' };
    }

    if (cell.mark === 'E') {
      return { success: false, message: '空きマスには使用できません' };
    }

    if (cell.protectT > 0) {
      return { success: false, message: '保護されているマスには使用できません' };
    }

    const validation = board.setCellState(params.position, { wildT: duration });
    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  private static lineBreak(gameState: GameState): CardEffectResult {
    gameState.lineBreakT = 1;
    return {
      success: true,
      message: '次の勝利判定を無効化します',
      boardChanged: false,
    };
  }

  private static forcePass(opponent: PlayerState): CardEffectResult {
    opponent.skipNextPlace = true;
    return {
      success: true,
      message: '相手の次の配置フェーズをスキップします',
      boardChanged: false,
    };
  }

  private static swap(board: Board, params: CardParams, playerIndex: number): CardEffectResult {
    if (!params.position1 || !params.position2) {
      return { success: false, message: 'position1とposition2が必要です' };
    }

    const validation = board.swapMarks(params.position1, params.position2, playerIndex);
    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  private static occupy(board: Board, params: CardParams, duration: number, playerIndex: number): CardEffectResult {
    if (!params.position) {
      return { success: false, message: 'positionが必要です' };
    }

    const cell = board.getCell(params.position);
    if (!cell) {
      return { success: false, message: '無効な位置です' };
    }

    if (cell.protectT > 0) {
      return { success: false, message: '保護されているマスには使用できません' };
    }

    // 占拠を設定
    const validation = board.setCellState(params.position, {
      occupyT: duration,
      occupyOwner: playerIndex
    });

    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  // ============================================
  // 防御カード
  // ============================================

  private static protect(board: Board, params: CardParams, duration: number): CardEffectResult {
    if (!params.position) {
      return { success: false, message: 'positionが必要です' };
    }

    const cell = board.getCell(params.position);
    if (!cell) {
      return { success: false, message: '無効な位置です' };
    }

    const validation = board.setCellState(params.position, { protectT: duration });
    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  private static dispel(board: Board, params: CardParams): CardEffectResult {
    if (!params.position) {
      return { success: false, message: 'positionが必要です' };
    }

    const cell = board.getCell(params.position);
    if (!cell) {
      return { success: false, message: '無効な位置です' };
    }

    // lockT, noLineT, wildTを解除（protectTは解除しない）
    const validation = board.setCellState(params.position, {
      lockT: 0,
      noLineT: 0,
      wildT: 0,
    });

    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  private static nullify(board: Board, params: CardParams): CardEffectResult {
    if (!params.position) {
      return { success: false, message: 'positionが必要です' };
    }

    const cell = board.getCell(params.position);
    if (!cell) {
      return { success: false, message: '無効な位置です' };
    }

    // すべての状態を解除
    const validation = board.setCellState(params.position, {
      lockT: 0,
      protectT: 0,
      noLineT: 0,
      wildT: 0,
    });

    return {
      success: validation.valid,
      message: validation.reason,
      boardChanged: validation.valid,
    };
  }

  // ============================================
  // 補助カード
  // ============================================

  private static draw(player: PlayerState, count: number): CardEffectResult {
    let drawn = 0;
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) break;

      const cardId = player.deck.shift()!;
      if (player.hand.length < DECK_CONSTRAINTS.MAX_HAND_SIZE) {
        player.hand.push(cardId);
        drawn++;
      } else {
        player.discardPile.push(cardId);
      }
    }

    return {
      success: true,
      message: `${drawn}枚ドローしました`,
      boardChanged: false,
      needsClientUpdate: true,
    };
  }

  private static reroll(player: PlayerState, params: CardParams): CardEffectResult {
    if (!params.discardIndices || params.discardIndices.length === 0) {
      return { success: false, message: '捨てるカードを指定してください' };
    }

    if (params.discardIndices.length > 2) {
      return { success: false, message: '捨てるカードは最大2枚です' };
    }

    // 捨てるカードを降順にソートして削除（インデックスのずれを防ぐ）
    const sortedIndices = [...params.discardIndices].sort((a, b) => b - a);
    for (const index of sortedIndices) {
      console.log('🗑️ Attempting to discard index:', index, 'from hand of length:', player.hand.length);
      if (index < 0 || index >= player.hand.length) {
        return { success: false, message: '無効な手札インデックスです' };
      }
      const discardedCard = player.hand.splice(index, 1)[0];
      player.discardPile.push(discardedCard);
    }

    // 同じ枚数を引く
    const drawCount = params.discardIndices.length;
    return this.draw(player, drawCount);
  }

  private static reclaim(player: PlayerState): CardEffectResult {
    if (player.discardPile.length === 0) {
      return { success: false, message: '捨て札がありません' };
    }

    const cardId = player.discardPile.pop()!;
    if (player.hand.length < DECK_CONSTRAINTS.MAX_HAND_SIZE) {
      player.hand.push(cardId);
    } else {
      player.discardPile.push(cardId); // 手札上限で戻す
      return { success: false, message: '手札が上限です' };
    }

    return {
      success: true,
      message: 'カードを手札に戻しました',
      boardChanged: false,
      needsClientUpdate: true,
    };
  }

  private static costReduction(player: PlayerState): CardEffectResult {
    player.ignoreCardLimit = true;
    return {
      success: true,
      message: '次のターンまでカード使用制限を無視できます',
      boardChanged: false,
    };
  }

  private static search(player: PlayerState, params: CardParams): CardEffectResult {
    // マルチステップカード処理
    if (!player.pendingCardAction) {
      // ステップ1: カテゴリを指定してサーチ開始
      if (!params.category) {
        return { success: false, message: 'カテゴリが必要です' };
      }

      const candidates: number[] = [];
      for (const cardId of player.deck) {
        const card = getCard(cardId);
        if (card && card.category === params.category) {
          candidates.push(cardId);
          if (candidates.length >= 5) break;
        }
      }

      if (candidates.length === 0) {
        return { success: false, message: '該当するカードが見つかりませんでした' };
      }

      player.pendingCardAction = {
        cardId: 23,
        step: 'SEARCH_START',
        candidates,
      };

      return {
        success: true,
        message: `${candidates.length}枚の候補が見つかりました`,
        boardChanged: false,
        needsClientUpdate: true,
      };
    } else {
      // ステップ2: 候補から1枚選択
      if (!params.selectedCardId) {
        return { success: false, message: '選択するカードIDが必要です' };
      }

      const candidates = player.pendingCardAction.candidates || [];
      if (!candidates.includes(params.selectedCardId)) {
        return { success: false, message: '無効なカード選択です' };
      }

      // デッキから選択したカードを削除
      const index = player.deck.indexOf(params.selectedCardId);
      if (index !== -1) {
        player.deck.splice(index, 1);
      }

      // 手札に追加
      if (player.hand.length < DECK_CONSTRAINTS.MAX_HAND_SIZE) {
        player.hand.push(params.selectedCardId);
      } else {
        player.discardPile.push(params.selectedCardId);
      }

      player.pendingCardAction = undefined;

      return {
        success: true,
        message: 'カードを手札に加えました',
        boardChanged: false,
        needsClientUpdate: true,
      };
    }
  }

  private static predict(player: PlayerState, params: CardParams): CardEffectResult {
    // マルチステップカード処理
    if (!player.pendingCardAction) {
      // ステップ1: 山札の上3枚を見る
      const candidates = player.deck.slice(0, 3);

      if (candidates.length === 0) {
        return { success: false, message: '山札にカードがありません' };
      }

      player.pendingCardAction = {
        cardId: 24,
        step: 'PREDICT_START',
        candidates,
      };

      return {
        success: true,
        message: `山札の上${candidates.length}枚を確認しました`,
        boardChanged: false,
        needsClientUpdate: true,
      };
    } else {
      // ステップ2: 候補から1枚選択
      if (!params.selectedCardId) {
        return { success: false, message: '選択するカードIDが必要です' };
      }

      const candidates = player.pendingCardAction.candidates || [];
      if (!candidates.includes(params.selectedCardId)) {
        return { success: false, message: '無効なカード選択です' };
      }

      // 選択したカードを山札から削除
      const index = player.deck.indexOf(params.selectedCardId);
      if (index !== -1 && index < 3) {
        player.deck.splice(index, 1);
      }

      // 手札に追加
      if (player.hand.length < DECK_CONSTRAINTS.MAX_HAND_SIZE) {
        player.hand.push(params.selectedCardId);
      } else {
        player.discardPile.push(params.selectedCardId);
      }

      player.pendingCardAction = undefined;

      return {
        success: true,
        message: 'カードを手札に加えました',
        boardChanged: false,
        needsClientUpdate: true,
      };
    }
  }

  /**
   * 占拠チェック：相手が占拠しているマスを対象にできないかチェック
   */
  private static isOccupiedByOpponent(
    cell: CellState,
    playerIndex: number
  ): boolean {
    return (
      cell.occupyT > 0 &&
      cell.occupyOwner !== undefined &&
      cell.occupyOwner !== playerIndex
    );
  }
}
