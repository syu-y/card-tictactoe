import type { Card, CardCategory } from '$lib/server/types/game.types';

/**
 * カードマスターデータ
 * カード一覧CSVから作成
 */
export const CARDS: Card[] = [
  {
    id: 1,
    name: '盤面拡張',
    category: '盤面操作',
    description: '盤面に行または列を1つ追加する（最大8×8）',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 2,
    name: '盤面縮小',
    category: '盤面操作',
    description: '盤面の端の行または列を1つ削除する（最小3×3）',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 3,
    name: 'プッシュ',
    category: '盤面操作',
    description: '指定した行または列を1マス分シフトする',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 4,
    name: 'スライド',
    category: '盤面操作',
    description: '自分のマークを隣接する空きマスへ移動',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 5,
    name: 'テレポート',
    category: '盤面操作',
    description: '自分のマークを任意の空きマスへ移動',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 6,
    name: 'コピー',
    category: '盤面操作',
    description: '自分のマークを同じ行/列上に複製。元は3ターン封鎖',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 7,
    name: '封鎖',
    category: '妨害',
    description: '指定マスを2ターン封鎖（配置・効果不可）',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 8,
    name: '二重封鎖',
    category: '妨害',
    description: '指定マスを4ターン封鎖（配置・効果不可）',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 9,
    name: '逆転',
    category: '妨害',
    description: '指定マスのマークを反転（O⇔X）',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 10,
    name: '強制移動',
    category: '妨害',
    description: '相手のマークを隣接マスへ強制移動',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 11,
    name: '分断',
    category: '妨害',
    description: '指定マスを含むラインを2ターン無効化',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 12,
    name: 'ワイルド',
    category: '妨害',
    description: '指定マスをOとXの両方として扱う（1ターン）',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 13,
    name: 'ラインブレイク',
    category: '妨害',
    description: '次の勝利判定を1回無効化',
    needsTarget: false,
    isMultiStep: false,
  },
  {
    id: 14,
    name: '強制パス',
    category: '妨害',
    description: '相手の次の配置フェーズをスキップさせる',
    needsTarget: false,
    isMultiStep: false,
  },
  {
    id: 15,
    name: '保護',
    category: '防御',
    description: '指定マスを2ターン保護（効果対象外）',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 16,
    name: '解除',
    category: '防御',
    description: '封鎖・分断・ワイルドを解除',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 17,
    name: '無効化',
    category: '防御',
    description: '指定マスのすべての状態効果を解除',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 18,
    name: '1ドロー',
    category: '補助',
    description: 'カードを1枚引く',
    needsTarget: false,
    isMultiStep: false,
  },
  {
    id: 19,
    name: '2ドロー',
    category: '補助',
    description: 'カードを2枚引く（このターン追加使用不可）',
    needsTarget: false,
    isMultiStep: false,
  },
  {
    id: 20,
    name: 'リロール',
    category: '補助',
    description: '手札最大2枚を捨てて同数引く',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 21,
    name: 'リクレイム',
    category: '補助',
    description: '捨て札の一番上を手札に戻す',
    needsTarget: false,
    isMultiStep: false,
  },
  {
    id: 22,
    name: 'コスト軽減',
    category: '補助',
    description: '次ターンまでカード使用制限を無視',
    needsTarget: false,
    isMultiStep: false,
  },
  {
    id: 23,
    name: 'サーチ',
    category: '補助',
    description: 'カテゴリを指定して山札から1枚獲得',
    needsTarget: true,
    isMultiStep: true,
  },
  {
    id: 24,
    name: '予知',
    category: '補助',
    description: '山札上3枚を確認し1枚獲得',
    needsTarget: true,
    isMultiStep: true,
  },
  {
    id: 25,
    name: 'ワイルド配置',
    category: '補助',
    description: '指定マスをワイルドにする（1ターン）',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 26,
    name: 'ライン分割',
    category: '盤面操作',
    description: '指定マスを含むラインを2ターン無効化',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 27,
    name: '入替',
    category: '妨害',
    description: '2つのマスのマークを入れ替える',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 28,
    name: '固定化',
    category: '防御',
    description: '指定マスを2ターン固定（効果対象外）',
    needsTarget: true,
    isMultiStep: false,
  },
  {
    id: 29,
    name: '占拠',
    category: '妨害',
    description: '相手はそのマスに配置・効果使用不可（2ターン）',
    needsTarget: true,
    isMultiStep: false,
  },
];

/**
 * カードIDからカード情報を取得
 */
export function getCard(cardId: number): Card | undefined {
  return CARDS.find(card => card.id === cardId);
}

/**
 * カテゴリでカードをフィルタリング
 */
export function getCardsByCategory(category: CardCategory): Card[] {
  return Object.values(CARDS).filter(card => card.category === category);
}

/**
 * すべてのカードIDを取得
 */
export function getAllCardIds(): number[] {
  return Object.keys(CARDS).map(Number);
}

/**
 * デッキのバリデーション
 */
export function validateDeck(deck: number[]): { valid: boolean; reason?: string } {
  // 20枚チェック
  if (deck.length !== 20) {
    return { valid: false, reason: 'デッキは20枚である必要があります' };
  }

  // すべて有効なカードIDかチェック
  for (const cardId of deck) {
    if (!CARDS[cardId]) {
      return { valid: false, reason: `無効なカードID: ${cardId}` };
    }
  }

  // 同じカードが3枚以上入っていないかチェック
  const cardCounts = new Map<number, number>();
  for (const cardId of deck) {
    const count = cardCounts.get(cardId) || 0;
    if (count >= 2) {
      const cardName = CARDS[cardId]?.name || `カード${cardId}`;
      return { valid: false, reason: `${cardName}は最大2枚までです` };
    }
    cardCounts.set(cardId, count + 1);
  }

  return { valid: true };
}

/**
 * ランダムなデッキを生成（デバッグ用）
 */
export function generateRandomDeck(): number[] {
  const allCardIds = getAllCardIds();
  const deck: number[] = [];

  for (let i = 0; i < 20; i++) {
    const randomIndex = Math.floor(Math.random() * allCardIds.length);
    deck.push(allCardIds[randomIndex]);
  }

  return deck;
}

/**
 * バランスの取れたデッキを生成（デフォルトデッキ）
 */
export function generateBalancedDeck(): number[] {
  return [
    1, 3, 4, 5,           // 盤面操作
    7, 9, 11, 14,         // 妨害
    15, 16, 17,           // 防御
    18, 18, 19, 20, 21,   // 補助（ドロー系）
    6, 10, 12, 23,        // 戦術カード
  ];
}
