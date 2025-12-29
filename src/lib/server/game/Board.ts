import type {
  BoardState,
  CellState,
  Position,
  Mark,
  Direction,
  RowCol,
  ValidationResult,
} from '$lib/server/types/game.types';
import { createEmptyCell, BOARD_CONSTRAINTS } from '$lib/server/types/game.types';

/**
 * 盤面管理クラス
 * 盤面の状態管理と操作を担当
 */
export class Board {
  private state: BoardState;

  constructor(initialSize: number = BOARD_CONSTRAINTS.INITIAL_SIZE) {
    this.state = this.createInitialBoard(initialSize);
  }

  /**
   * 初期盤面を作成
   */
  private createInitialBoard(size: number): BoardState {
    const cells: CellState[][] = [];
    for (let row = 0; row < size; row++) {
      cells[row] = [];
      for (let col = 0; col < size; col++) {
        cells[row][col] = createEmptyCell();
      }
    }

    return {
      cells,
      rows: size,
      cols: size,
    };
  }

  /**
   * 現在の盤面状態を取得
   */
  getState(): BoardState {
    return JSON.parse(JSON.stringify(this.state)); // Deep copy
  }

  /**
   * 盤面状態を設定（主にロード時に使用）
   */
  setState(state: BoardState): void {
    this.state = JSON.parse(JSON.stringify(state)); // Deep copy
  }

  /**
   * 指定位置のセルを取得
   */
  getCell(pos: Position): CellState | null {
    if (!this.isValidPosition(pos)) return null;
    return { ...this.state.cells[pos.row][pos.col] };
  }

  /**
   * 指定位置が有効かチェック
   */
  isValidPosition(pos: Position): boolean {
    return (
      pos.row >= 0 &&
      pos.row < this.state.rows &&
      pos.col >= 0 &&
      pos.col < this.state.cols
    );
  }

  /**
   * マークを配置
   */
  placeMark(pos: Position, mark: Mark): ValidationResult {
    const playerIndex = mark === 'O' ? 0 : 1;
    if (!this.isValidPosition(pos)) {
      return { valid: false, reason: '無効な位置です' };
    }

    const cell = this.state.cells[pos.row][pos.col];

    // 空きマスかチェック
    if (cell.mark !== 'E') {
      return { valid: false, reason: 'このマスは既に使用されています' };
    }

    // 封鎖されていないかチェック
    if (cell.lockT > 0) {
      return { valid: false, reason: 'このマスは封鎖されています' };
    }

    // 占拠されているかチェック
    if (cell.occupyT > 0 && cell.occupyOwner !== undefined && cell.occupyOwner !== playerIndex) {
      return { valid: false, reason: 'このマスは相手に占拠されています' };
    }

    // マークを配置
    this.state.cells[pos.row][pos.col].mark = mark;
    return { valid: true };
  }

  /**
   * 盤面を拡張（行または列を追加）
   */
  expand(rowCol: RowCol, direction: Direction): ValidationResult {
    const currentSize = rowCol === 'ROW' ? this.state.rows : this.state.cols;

    // 最大サイズチェック
    if (currentSize >= BOARD_CONSTRAINTS.MAX_SIZE) {
      return { valid: false, reason: `盤面サイズは最大${BOARD_CONSTRAINTS.MAX_SIZE}×${BOARD_CONSTRAINTS.MAX_SIZE}です` };
    }

    if (rowCol === 'ROW') {
      this.expandRow(direction);
    } else {
      this.expandCol(direction);
    }

    return { valid: true };
  }

  private expandRow(direction: Direction): void {
    const newRow: CellState[] = [];
    for (let col = 0; col < this.state.cols; col++) {
      newRow.push(createEmptyCell());
    }

    if (direction === 'UP') {
      this.state.cells.unshift(newRow);
    } else {
      this.state.cells.push(newRow);
    }
    this.state.rows++;
  }

  private expandCol(direction: Direction): void {
    for (let row = 0; row < this.state.rows; row++) {
      if (direction === 'LEFT') {
        this.state.cells[row].unshift(createEmptyCell());
      } else {
        this.state.cells[row].push(createEmptyCell());
      }
    }
    this.state.cols++;
  }

  /**
   * 盤面を縮小（行または列を削除）
   */
  shrink(rowCol: RowCol, direction: Direction): ValidationResult {
    const currentSize = rowCol === 'ROW' ? this.state.rows : this.state.cols;

    // 最小サイズチェック
    if (currentSize <= BOARD_CONSTRAINTS.MIN_SIZE) {
      return { valid: false, reason: `盤面サイズは最小${BOARD_CONSTRAINTS.MIN_SIZE}×${BOARD_CONSTRAINTS.MIN_SIZE}です` };
    }

    // 削除対象にマークがあるかチェック
    if (rowCol === 'ROW') {
      const rowIndex = direction === 'UP' ? 0 : this.state.rows - 1;
      for (let col = 0; col < this.state.cols; col++) {
        if (this.state.cells[rowIndex][col].mark !== 'E') {
          return { valid: false, reason: '削除対象の行にマークが存在します' };
        }
      }
    } else {
      const colIndex = direction === 'LEFT' ? 0 : this.state.cols - 1;
      for (let row = 0; row < this.state.rows; row++) {
        if (this.state.cells[row][colIndex].mark !== 'E') {
          return { valid: false, reason: '削除対象の列にマークが存在します' };
        }
      }
    }

    if (rowCol === 'ROW') {
      this.shrinkRow(direction);
    } else {
      this.shrinkCol(direction);
    }

    return { valid: true };
  }

  private shrinkRow(direction: Direction): void {
    if (direction === 'UP') {
      this.state.cells.shift();
    } else {
      this.state.cells.pop();
    }
    this.state.rows--;
  }

  private shrinkCol(direction: Direction): void {
    for (let row = 0; row < this.state.rows; row++) {
      if (direction === 'LEFT') {
        this.state.cells[row].shift();
      } else {
        this.state.cells[row].pop();
      }
    }
    this.state.cols--;
  }

  /**
   * プッシュ（行または列をシフト）
   */
  push(rowCol: RowCol, index: number, direction: Direction): ValidationResult {
    if (rowCol === 'ROW') {
      if (index < 0 || index >= this.state.rows) {
        return { valid: false, reason: '無効な行インデックスです' };
      }
      this.pushRow(index, direction);
    } else {
      if (index < 0 || index >= this.state.cols) {
        return { valid: false, reason: '無効な列インデックスです' };
      }
      this.pushCol(index, direction);
    }

    return { valid: true };
  }

  private pushRow(rowIndex: number, direction: Direction): void {
    const row = this.state.cells[rowIndex];

    if (direction === 'LEFT') {
      // 左端を削除、右端に空セルを追加
      row.shift();
      row.push(createEmptyCell());
    } else {
      // 右端を削除、左端に空セルを追加
      row.pop();
      row.unshift(createEmptyCell());
    }
  }

  private pushCol(colIndex: number, direction: Direction): void {
    if (direction === 'UP') {
      // 上端を削除、下端に空セルを追加
      for (let row = 0; row < this.state.rows - 1; row++) {
        this.state.cells[row][colIndex] = this.state.cells[row + 1][colIndex];
      }
      this.state.cells[this.state.rows - 1][colIndex] = createEmptyCell();
    } else {
      // 下端を削除、上端に空セルを追加
      for (let row = this.state.rows - 1; row > 0; row--) {
        this.state.cells[row][colIndex] = this.state.cells[row - 1][colIndex];
      }
      this.state.cells[0][colIndex] = createEmptyCell();
    }
  }

  /**
   * マークを移動（スライド、テレポート、強制移動用）
   */
  moveMark(from: Position, to: Position, validateAdjacent: boolean = false): ValidationResult {
    if (!this.isValidPosition(from) || !this.isValidPosition(to)) {
      return { valid: false, reason: '無効な位置です' };
    }

    const fromCell = this.state.cells[from.row][from.col];
    const toCell = this.state.cells[to.row][to.col];

    // 移動元にマークがあるかチェック
    if (fromCell.mark === 'E') {
      return { valid: false, reason: '移動元にマークがありません' };
    }

    // 移動元が保護されていないかチェック
    if (fromCell.protectT > 0) {
      return { valid: false, reason: '移動元が保護されています' };
    }

    // 移動先が空きかチェック
    if (toCell.mark !== 'E') {
      return { valid: false, reason: '移動先にマークが存在します' };
    }

    // 移動先が封鎖されていないかチェック
    if (toCell.lockT > 0) {
      return { valid: false, reason: '移動先が封鎖されています' };
    }

    // 移動先が保護されていないかチェック
    if (toCell.protectT > 0) {
      return { valid: false, reason: '移動先が保護されています' };
    }

    // 隣接チェック（スライド用）
    if (validateAdjacent && !this.isAdjacent(from, to)) {
      return { valid: false, reason: '移動先は隣接するマスである必要があります' };
    }

    // 移動実行
    this.state.cells[to.row][to.col].mark = fromCell.mark;
    this.state.cells[from.row][from.col].mark = 'E';

    return { valid: true };
  }

  /**
   * 2つの位置が隣接しているかチェック
   */
  private isAdjacent(pos1: Position, pos2: Position): boolean {
    const rowDiff = Math.abs(pos1.row - pos2.row);
    const colDiff = Math.abs(pos1.col - pos2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  /**
   * マークをコピー
   */
  copyMark(from: Position, to: Position): ValidationResult {
    if (!this.isValidPosition(from) || !this.isValidPosition(to)) {
      return { valid: false, reason: '無効な位置です' };
    }

    const fromCell = this.state.cells[from.row][from.col];
    const toCell = this.state.cells[to.row][to.col];

    // コピー元にマークがあるかチェック
    if (fromCell.mark === 'E') {
      return { valid: false, reason: 'コピー元にマークがありません' };
    }

    // コピー元が保護されていないかチェック
    if (fromCell.protectT > 0) {
      return { valid: false, reason: 'コピー元が保護されています' };
    }

    // コピー先が空きかチェック
    if (toCell.mark !== 'E') {
      return { valid: false, reason: 'コピー先にマークが存在します' };
    }

    // コピー先が封鎖されていないかチェック
    if (toCell.lockT > 0) {
      return { valid: false, reason: 'コピー先が封鎖されています' };
    }

    // コピー先が保護されていないかチェック
    if (toCell.protectT > 0) {
      return { valid: false, reason: 'コピー先が保護されています' };
    }

    // 同じ行または同じ列かチェック
    if (from.row !== to.row && from.col !== to.col) {
      return { valid: false, reason: 'コピー先は同じ行または同じ列である必要があります' };
    }

    // コピー実行
    this.state.cells[to.row][to.col].mark = fromCell.mark;
    // コピー元を封鎖
    this.state.cells[from.row][from.col].lockT = 3;

    return { valid: true };
  }

  /**
   * マークを反転
   */
  flipMark(pos: Position, playerIndex: number): ValidationResult {
    if (!this.isValidPosition(pos)) {
      return { valid: false, reason: '無効な位置です' };
    }

    const cell = this.state.cells[pos.row][pos.col];

    // 空きマスでないかチェック
    if (cell.mark === 'E') {
      return { valid: false, reason: '空きマスには使用できません' };
    }

    // 保護されていないかチェック
    if (cell.protectT > 0) {
      return { valid: false, reason: '保護されているマスには使用できません' };
    }

    // 占拠チェック
    if (cell.occupyT > 0 && cell.occupyOwner !== undefined && cell.occupyOwner !== playerIndex) {
      return { valid: false, reason: 'このマスは相手に占拠されています' };
    }

    // 反転実行
    this.state.cells[pos.row][pos.col].mark = cell.mark === 'O' ? 'X' : 'O';

    return { valid: true };
  }

  /**
   * 2つのマスを入れ替え
   */
  swapMarks(pos1: Position, pos2: Position, playerIndex: number): ValidationResult {
    if (!this.isValidPosition(pos1) || !this.isValidPosition(pos2)) {
      return { valid: false, reason: '無効な位置です' };
    }

    const cell1 = this.state.cells[pos1.row][pos1.col];
    const cell2 = this.state.cells[pos2.row][pos2.col];

    // 両方にマークがあるかチェック
    if (cell1.mark === 'E' || cell2.mark === 'E') {
      return { valid: false, reason: '両方のマスにマークが必要です' };
    }

    // 保護されていないかチェック
    if (cell1.protectT > 0 || cell2.protectT > 0) {
      return { valid: false, reason: '保護されているマスは入れ替えできません' };
    }

    // 占拠チェック
    if ((cell1.occupyT > 0 && cell1.occupyOwner !== undefined && cell1.occupyOwner !== playerIndex) &&
      (cell2.occupyT > 0 && cell2.occupyOwner !== undefined && cell2.occupyOwner !== playerIndex)) {
      return { valid: false, reason: 'このマスは相手に占拠されています' };
    }

    // 入れ替え実行
    const temp = cell1.mark;
    this.state.cells[pos1.row][pos1.col].mark = cell2.mark;
    this.state.cells[pos2.row][pos2.col].mark = temp;

    return { valid: true };
  }

  /**
   * セルに状態を設定
   */
  setCellState(pos: Position, state: Partial<CellState>): ValidationResult {
    if (!this.isValidPosition(pos)) {
      return { valid: false, reason: '無効な位置です' };
    }

    const cell = this.state.cells[pos.row][pos.col];

    // 状態を更新
    if (state.lockT !== undefined) cell.lockT = state.lockT;
    if (state.protectT !== undefined) cell.protectT = state.protectT;
    if (state.noLineT !== undefined) cell.noLineT = state.noLineT;
    if (state.wildT !== undefined) cell.wildT = state.wildT;

    return { valid: true };
  }

  /**
   * ターン終了時の状態更新（各種カウンタをデクリメント）
   */
  decrementTimers(): void {
    for (let row = 0; row < this.state.rows; row++) {
      for (let col = 0; col < this.state.cols; col++) {
        const cell = this.state.cells[row][col];
        if (cell.lockT > 0) cell.lockT--;
        if (cell.protectT > 0) cell.protectT--;
        if (cell.noLineT > 0) cell.noLineT--;
        if (cell.wildT > 0) cell.wildT--;
      }
    }
  }

  /**
   * すべてのマークの位置を取得
   */
  getAllMarkPositions(mark?: Mark): Position[] {
    const positions: Position[] = [];
    for (let row = 0; row < this.state.rows; row++) {
      for (let col = 0; col < this.state.cols; col++) {
        const cell = this.state.cells[row][col];
        if (!mark || cell.mark === mark) {
          if (cell.mark !== 'E') {
            positions.push({ row, col });
          }
        }
      }
    }
    return positions;
  }
}
