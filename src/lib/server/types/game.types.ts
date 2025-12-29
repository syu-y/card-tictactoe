// ============================================
// 基本型定義
// ============================================

/** プレイヤーID */
export type PlayerId = string | null;

/** マークの種類 */
export type Mark = 'O' | 'X' | 'E'; // O: 先攻, X: 後攻, E: Empty

/** ゲームフェーズ */
export type GamePhase =
  | 'WAITING'        // プレイヤー待機中
  | 'DECK_SELECT'    // デッキ選択中
  | 'CARD'           // カード使用フェーズ
  | 'PLACE'          // マーク配置フェーズ
  | 'GAME_OVER';     // ゲーム終了

/** カードカテゴリ */
export type CardCategory = '盤面操作' | '妨害' | '防御' | '補助';

/** 方向指定 */
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

/** 行列指定 */
export type RowCol = 'ROW' | 'COL';

// ============================================
// 位置・座標
// ============================================

/** 盤面上の位置 */
export interface Position {
  row: number;
  col: number;
}

// ============================================
// マスの状態
// ============================================

/** マスの状態 */
export interface CellState {
  mark: Mark;
  lockT: number;       // 封鎖ターン数（0なら封鎖なし）
  protectT: number;    // 保護ターン数（0なら保護なし）
  noLineT: number;     // 分断ターン数（0なら分断なし）
  wildT: number;       // ワイルド状態（0ならワイルドなし）
  occupyT: number;     // 占拠ターン数（0なら占拠なし）
  occupyOwner?: number;  // 占拠したプレイヤー（0または1）
}

/** 初期マス状態 */
export const createEmptyCell = (): CellState => ({
  mark: 'E',
  lockT: 0,
  protectT: 0,
  noLineT: 0,
  wildT: 0,
  occupyT: 0,
  occupyOwner: undefined,
});

// ============================================
// カード関連
// ============================================

/** カード情報 */
export interface Card {
  id: number;
  name: string;
  category: CardCategory;
  description: string;
  needsTarget: boolean;        // ターゲット指定が必要か
  isMultiStep: boolean;        // 複数段階のカードか（サーチ、予知）
}

/** カード使用時のパラメータ（カードによって必要なものが異なる） */
export interface CardParams {
  // 位置指定
  position?: Position;
  fromPosition?: Position;
  toPosition?: Position;
  position1?: Position;
  position2?: Position;

  // 方向・行列指定
  direction?: Direction;
  rowCol?: RowCol;
  rowOrCol?: number;

  // その他
  category?: CardCategory;      // サーチ用
  discardIndices?: number[];    // リロール用
  selectedCardId?: number;      // サーチ・予知の選択用
}

/** カード使用リクエスト */
export interface UseCardRequest {
  cardId: number;
  params: CardParams;
}

// ============================================
// プレイヤー情報
// ============================================

/** プレイヤー状態 */
export interface PlayerState {
  id: PlayerId;
  mark: Mark;
  deck: number[];              // デッキのカードID配列
  hand: number[];              // 手札のカードID配列
  discardPile: number[];       // 捨て札のカードID配列

  // 状態フラグ
  skipNextPlace: boolean;      // 次の配置をスキップするか（強制パス）
  ignoreCardLimit: boolean;    // カード使用制限を無視するか（コスト軽減）
  noMoreCardThisTurn: boolean; // このターンはもうカード使えない（2ドロー後）

  // マルチステップカード用の一時データ
  pendingCardAction: {
    cardId: number;
    step: 'SEARCH_START' | 'SEARCH_PICK' | 'PREDICT_START' | 'PREDICT_PICK';
    candidates?: number[];     // サーチ・予知の候補カードID
  } | null;
}

// ============================================
// 盤面情報
// ============================================

/** 盤面状態 */
export interface BoardState {
  cells: CellState[][];        // 2次元配列 [row][col]
  rows: number;                // 現在の行数
  cols: number;                // 現在の列数
}

// ============================================
// ゲーム状態
// ============================================

/** ゲーム全体の状態 */
export interface GameState {
  roomId: string;
  phase: GamePhase;
  board: BoardState;
  players: [PlayerState, PlayerState]; // 必ず2人
  currentPlayer: 0 | 1;        // 現在のプレイヤーインデックス
  turnCount: number;           // ターン数

  // グローバル状態
  lineBreakT: number;          // ラインブレイク状態（次の勝利判定を無効化）

  // ゲーム結果
  winner?: PlayerId;
  winningLine?: Position[];    // 勝利ライン

  // ターン内の制限
  cardUsedThisTurn: boolean;   // このターン既にカードを使用したか
}

// ============================================
// メッセージ型定義
// ============================================

/** クライアント → サーバー へのメッセージ */
export type ClientMessage =
  | { type: 'JOIN_ROOM'; roomId: string; playerId: PlayerId; playerName?: string; }
  | { type: 'SET_DECK'; deck: number[] }
  | { type: 'READY' }
  | { type: 'PLACE_MARK'; position: Position }
  | { type: 'USE_CARD'; cardId: number; params: CardParams }
  | { type: 'END_TURN' }
  | { type: 'CANCEL_CARD' }
  | { type: 'LEAVE_ROOM' }
  | { type: 'CHAT'; message: string }
  | { type: 'QUICKSTART'; playerId: PlayerId; playerName: string }
  | { type: 'REMATCH_REQUEST' };

/** サーバー → クライアント へのメッセージ */
export type ServerMessage =
  | { type: 'ROOM_JOINED'; playerId: string; playerIndex: 0 | 1 }
  | { type: 'OPPONENT_JOINED'; opponentId: string; opponentName: string }
  | { type: 'GAME_STATE'; state: GameState }
  | { type: 'GAME_STARTED' }
  | { type: 'TURN_START'; playerId: string }
  | { type: 'CARD_USED'; playerId: string; cardId: number; cardName: string }
  | { type: 'MARK_PLACED'; playerId: string; position: Position }
  | { type: 'TURN_END'; playerId: string }
  | { type: 'GAME_OVER'; winner: PlayerId; reason: string }
  | { type: 'ERROR'; message: string; code?: string }
  | { type: 'INFO'; message: string }
  | { type: 'OPPONENT_LEFT' }
  | { type: 'CHAT'; playerId: string; message: string }
  | { type: 'MATCH_FOUND'; roomId: string; playerIndex: 0 | 1 }
  | { type: 'REMATCH_REQUESTED'; playerId: string }
  | { type: 'REMATCH_STARTED' };

// ============================================
// 勝利判定
// ============================================

/** 勝利ライン情報 */
export interface WinningLine {
  positions: Position[];
  type: 'row' | 'col' | 'diag1' | 'diag2';
}

// ============================================
// ユーティリティ型
// ============================================

/** カード効果の結果 */
export interface CardEffectResult {
  success: boolean;
  message?: string;
  boardChanged?: boolean;       // 盤面が変更されたか
  needsClientUpdate?: boolean;  // クライアント側の更新が必要か
}

/** バリデーション結果 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// ============================================
// デッキ構築関連
// ============================================

/** デッキ設定 */
export interface DeckConfig {
  cards: number[];             // 20枚のカードID
  name?: string;
  createdAt?: Date;
}

/** デッキバリデーション制約 */
export const DECK_CONSTRAINTS = {
  DECK_SIZE: 20,
  MIN_HAND_SIZE: 0,
  MAX_HAND_SIZE: 10,
  INITIAL_HAND_SIZE: 3,
} as const;

// ============================================
// 盤面制約
// ============================================

export const BOARD_CONSTRAINTS = {
  MIN_SIZE: 3,
  MAX_SIZE: 8,
  INITIAL_SIZE: 3,
  WIN_LINE_LENGTH: 3,  // 勝利に必要なマーク数
} as const;
