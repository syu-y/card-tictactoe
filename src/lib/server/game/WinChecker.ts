import type { BoardState, Mark, Position, WinningLine } from '$lib/server/types/game.types';
import { BOARD_CONSTRAINTS } from '$lib/server/types/game.types';

/**
 * 勝利判定クラス
 */
export class WinChecker {
  /**
   * 勝利判定を行う
   * @returns 勝者のマーク（勝者がいない場合はnull）と勝利ライン
   */
  static checkWin(board: BoardState): { winner: Mark | null; line: WinningLine | null } {
    // 横のラインをチェック
    for (let row = 0; row < board.rows; row++) {
      const result = this.checkRow(board, row);
      if (result.winner) {
        return {
          winner: result.winner,
          line: {
            positions: result.positions,
            type: 'row',
          },
        };
      }
    }

    // 縦のラインをチェック
    for (let col = 0; col < board.cols; col++) {
      const result = this.checkCol(board, col);
      if (result.winner) {
        return {
          winner: result.winner,
          line: {
            positions: result.positions,
            type: 'col',
          },
        };
      }
    }

    // 斜め（左上→右下）のラインをチェック
    const diag1Result = this.checkDiagonal1(board);
    if (diag1Result.winner) {
      return {
        winner: diag1Result.winner,
        line: {
          positions: diag1Result.positions,
          type: 'diag1',
        },
      };
    }

    // 斜め（右上→左下）のラインをチェック
    const diag2Result = this.checkDiagonal2(board);
    if (diag2Result.winner) {
      return {
        winner: diag2Result.winner,
        line: {
          positions: diag2Result.positions,
          type: 'diag2',
        },
      };
    }

    return { winner: null, line: null };
  }

  /**
   * 行のチェック
   */
  private static checkRow(board: BoardState, row: number): { winner: Mark | null; positions: Position[] } {
    const winLength = BOARD_CONSTRAINTS.WIN_LINE_LENGTH;

    // スライディングウィンドウで3連続をチェック
    for (let startCol = 0; startCol <= board.cols - winLength; startCol++) {
      const positions: Position[] = [];
      for (let i = 0; i < winLength; i++) {
        positions.push({ row, col: startCol + i });
      }

      const winner = this.checkLine(board, positions);
      if (winner) {
        return { winner, positions };
      }
    }

    return { winner: null, positions: [] };
  }

  /**
   * 列のチェック
   */
  private static checkCol(board: BoardState, col: number): { winner: Mark | null; positions: Position[] } {
    const winLength = BOARD_CONSTRAINTS.WIN_LINE_LENGTH;

    // スライディングウィンドウで3連続をチェック
    for (let startRow = 0; startRow <= board.rows - winLength; startRow++) {
      const positions: Position[] = [];
      for (let i = 0; i < winLength; i++) {
        positions.push({ row: startRow + i, col });
      }

      const winner = this.checkLine(board, positions);
      if (winner) {
        return { winner, positions };
      }
    }

    return { winner: null, positions: [] };
  }

  /**
   * 斜め（左上→右下）のチェック
   */
  private static checkDiagonal1(board: BoardState): { winner: Mark | null; positions: Position[] } {
    const winLength = BOARD_CONSTRAINTS.WIN_LINE_LENGTH;

    // すべての可能な斜めラインをチェック
    for (let startRow = 0; startRow <= board.rows - winLength; startRow++) {
      for (let startCol = 0; startCol <= board.cols - winLength; startCol++) {
        const positions: Position[] = [];
        for (let i = 0; i < winLength; i++) {
          positions.push({ row: startRow + i, col: startCol + i });
        }

        const winner = this.checkLine(board, positions);
        if (winner) {
          return { winner, positions };
        }
      }
    }

    return { winner: null, positions: [] };
  }

  /**
   * 斜め（右上→左下）のチェック
   */
  private static checkDiagonal2(board: BoardState): { winner: Mark | null; positions: Position[] } {
    const winLength = BOARD_CONSTRAINTS.WIN_LINE_LENGTH;

    // すべての可能な斜めラインをチェック
    for (let startRow = 0; startRow <= board.rows - winLength; startRow++) {
      for (let startCol = winLength - 1; startCol < board.cols; startCol++) {
        const positions: Position[] = [];
        for (let i = 0; i < winLength; i++) {
          positions.push({ row: startRow + i, col: startCol - i });
        }

        const winner = this.checkLine(board, positions);
        if (winner) {
          return { winner, positions };
        }
      }
    }

    return { winner: null, positions: [] };
  }

  /**
   * 指定された位置の配列がラインを形成しているかチェック
   */
  private static checkLine(board: BoardState, positions: Position[]): Mark | null {
    // 分断チェック - 1つでも分断されていればこのラインは無効
    for (const pos of positions) {
      const cell = board.cells[pos.row][pos.col];
      if (cell.noLineT > 0) {
        return null;
      }
    }

    // O の勝利をチェック
    if (this.isWinningLineForMark(board, positions, 'O')) {
      return 'O';
    }

    // X の勝利をチェック
    if (this.isWinningLineForMark(board, positions, 'X')) {
      return 'X';
    }

    return null;
  }

  /**
   * 指定されたマークが勝利ラインを形成しているかチェック
   */
  private static isWinningLineForMark(board: BoardState, positions: Position[], mark: Mark): boolean {
    for (const pos of positions) {
      const cell = board.cells[pos.row][pos.col];

      // ワイルド状態ならO/X両方として扱う
      if (cell.wildT > 0) {
        continue; // ワイルドは常にマッチする
      }

      // 指定されたマークでないなら失敗
      if (cell.mark !== mark) {
        return false;
      }
    }

    return true;
  }

  /**
   * 盤面が埋まっているかチェック（引き分け判定用）
   */
  static isBoardFull(board: BoardState): boolean {
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        // 空きマスかつ封鎖されていないマスがあれば盤面は満杯ではない
        if (cell.mark === 'E' && cell.lockT === 0) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * ゲーム終了判定（勝者がいるか、引き分けか）
   */
  static checkGameOver(board: BoardState): {
    isOver: boolean;
    winner: Mark | null;
    reason: 'win' | 'draw' | null;
    line: WinningLine | null;
  } {
    // 勝利判定
    const winResult = this.checkWin(board);
    if (winResult.winner) {
      return {
        isOver: true,
        winner: winResult.winner,
        reason: 'win',
        line: winResult.line,
      };
    }

    // 引き分け判定
    if (this.isBoardFull(board)) {
      return {
        isOver: true,
        winner: null,
        reason: 'draw',
        line: null,
      };
    }

    // ゲーム続行
    return {
      isOver: false,
      winner: null,
      reason: null,
      line: null,
    };
  }

  /**
   * 指定されたマークが次のターンで勝てる位置を取得（AI用）
   */
  static getWinningMoves(board: BoardState, mark: Mark): Position[] {
    const winningMoves: Position[] = [];

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];

        // 空きマスかつ封鎖されていないマスのみチェック
        if (cell.mark === 'E' && cell.lockT === 0) {
          // 仮想的にマークを置いてみる
          const testBoard: BoardState = JSON.parse(JSON.stringify(board));
          testBoard.cells[row][col].mark = mark;

          // 勝利判定
          const result = this.checkWin(testBoard);
          if (result.winner === mark) {
            winningMoves.push({ row, col });
          }
        }
      }
    }

    return winningMoves;
  }

  /**
   * 指定された位置にマークを置くことで相手の勝利を阻止できるかチェック（AI用）
   */
  static getBlockingMoves(board: BoardState, opponentMark: Mark): Position[] {
    return this.getWinningMoves(board, opponentMark);
  }

  /**
   * デバッグ用：盤面を文字列で表示
   */
  static boardToString(board: BoardState): string {
    let result = '';
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        let cellStr = cell.mark === 'E' ? '.' : cell.mark;

        // 状態を付加
        if (cell.lockT > 0) cellStr += `(L${cell.lockT})`;
        if (cell.protectT > 0) cellStr += `(P${cell.protectT})`;
        if (cell.noLineT > 0) cellStr += `(N${cell.noLineT})`;
        if (cell.wildT > 0) cellStr += `(W${cell.wildT})`;

        result += cellStr.padEnd(10, ' ');
      }
      result += '\n';
    }
    return result;
  }
}
