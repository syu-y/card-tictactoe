<!-- src/lib/components/DeckBuilder.svelte -->
<script lang="ts">
  import { CARDS, getAllCardIds, generateBalancedDeck } from '$lib/utils/cardData';
  import type { CardCategory } from '$lib/server/types/game.types';
  import Card from './Card.svelte';

  interface Props {
    onDeckComplete?: (deck: number[]) => void;
    onCancel?: () => void;
  }

  let { onDeckComplete, onCancel }: Props = $props();

  let deck = $state<number[]>([]);
  let selectedCategory = $state<CardCategory | 'all'>('all');
  let searchQuery = $state('');

  const DECK_SIZE = 20;

  // カテゴリでフィルタリング
  let filteredCards = $derived.by(() => {
    const allCards = getAllCardIds().map(id => CARDS[id]);
    
    let filtered = allCards;
    
    // カテゴリフィルタ
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(card => card.category === selectedCategory);
    }
    
    // 検索フィルタ
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(card => 
        card.name.toLowerCase().includes(query) ||
        card.description.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  });

  // デッキ内のカード枚数をカウント
  function getCardCount(cardId: number): number {
    return deck.filter(id => id === cardId).length;
  }

  // カードをデッキに追加
  function addCard(cardId: number) {
    if (deck.length >= DECK_SIZE) {
      alert(`デッキは${DECK_SIZE}枚までです`);
      return;
    }
    
    // 同じカードが既に2枚入っているかチェック
    const count = deck.filter(id => id === cardId).length;
    if (count >= 2) {
      const card = CARDS[cardId];
      alert(`${card?.name || 'カード'}は最大2枚までです`);
      return;
    }
    
    deck = [...deck, cardId];
  }

  // カードをデッキから削除
  function removeCard(cardId: number) {
    const index = deck.findIndex(id => id === cardId);
    if (index !== -1) {
      deck = [...deck.slice(0, index), ...deck.slice(index + 1)];
    }
  }

  // デッキをクリア
  function clearDeck() {
    if (confirm('デッキをクリアしますか？')) {
      deck = [];
    }
  }

  // バランスの取れたデッキを自動生成
  function autoBuild() {
    if (deck.length > 0 && !confirm('現在のデッキを上書きしますか？')) {
      return;
    }
    deck = generateBalancedDeck();
  }

  // デッキを確定
  function completeDeck() {
    if (deck.length !== DECK_SIZE) {
      alert(`デッキは${DECK_SIZE}枚である必要があります`);
      return;
    }
    if (onDeckComplete) {
      onDeckComplete(deck);
    }
  }

  // カテゴリ一覧
  const categories: Array<{ value: CardCategory | 'all'; label: string }> = [
    { value: 'all', label: 'すべて' },
    { value: '盤面操作', label: '盤面操作' },
    { value: '妨害', label: '妨害' },
    { value: '防御', label: '防御' },
    { value: '補助', label: '補助' },
  ];
</script>

<div class="deck-builder">
  <div class="header">
    <h2>デッキ構築</h2>
    <div class="deck-counter" class:complete={deck.length === DECK_SIZE}>
      {deck.length} / {DECK_SIZE}
    </div>
  </div>

  <div class="toolbar">
    <div class="filters">
      <input
        type="text"
        placeholder="カード名で検索..."
        bind:value={searchQuery}
        class="search-input"
      />
      
      <select bind:value={selectedCategory} class="category-select">
        {#each categories as category}
          <option value={category.value}>{category.label}</option>
        {/each}
      </select>
    </div>

    <div class="actions">
      <button onclick={autoBuild} class="btn btn-secondary">
        自動構築
      </button>
      <button onclick={clearDeck} class="btn btn-secondary">
        クリア
      </button>
    </div>
  </div>

  <div class="content">
    <div class="card-list">
      <h3>カード一覧</h3>
      <div class="cards-grid">
        {#each filteredCards as card (card.id)}
          <div class="card-item">
            <Card
              cardId={card.id}
              onclick={() => addCard(card.id)}
              isClickable={deck.length < DECK_SIZE}
            />
            <div class="card-count" class:max-count={getCardCount(card.id) >= 2}>
              デッキ内: {getCardCount(card.id)} / 2
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="deck-area">
      <h3>デッキ ({deck.length}枚)</h3>
      {#if deck.length === 0}
        <div class="empty-deck">
          <p>カードを選択してデッキに追加してください</p>
        </div>
      {:else}
        <div class="deck-cards">
          {#each deck as cardId, index (index)}
            <div class="deck-card-item">
              <Card
                {cardId}
                onclick={() => removeCard(cardId)}
                isClickable={true}
              />
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="footer">
    <button onclick={onCancel} class="btn btn-secondary">
      キャンセル
    </button>
    <button 
      onclick={completeDeck} 
      class="btn btn-primary"
      disabled={deck.length !== DECK_SIZE}
    >
      デッキ確定
    </button>
  </div>
</div>

<style>
  .deck-builder {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-height: 100vh;
    background: #f5f5f5;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    border-bottom: 2px solid #ddd;
  }

  .header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #333;
  }

  .deck-counter {
    font-size: 1.5rem;
    font-weight: bold;
    color: #666;
    padding: 0.5rem 1rem;
    background: #f0f0f0;
    border-radius: 8px;
  }

  .deck-counter.complete {
    background: #4CAF50;
    color: white;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    border-bottom: 1px solid #ddd;
    gap: 1rem;
  }

  .filters {
    display: flex;
    gap: 1rem;
    flex: 1;
  }

  .search-input {
    flex: 1;
    max-width: 300px;
    padding: 0.5rem 1rem;
    border: 2px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .search-input:focus {
    outline: none;
    border-color: #2196F3;
  }

  .category-select {
    padding: 0.5rem 1rem;
    border: 2px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
    background: white;
    cursor: pointer;
  }

  .category-select:focus {
    outline: none;
    border-color: #2196F3;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .content {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
    padding: 1rem 2rem;
    overflow: hidden;
    flex: 1;
  }

  .card-list,
  .deck-area {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .card-list h3,
  .deck-area h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #333;
    position: sticky;
    top: 0;
    /* background: white; */
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #ddd;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
  }

  .card-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .card-count {
    font-size: 0.85rem;
    color: #666;
    font-weight: 600;
  }

  .card-count.max-count {
    color: #f44336;
    font-weight: bold;
  }

  .deck-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
  }

  .empty-deck {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: #999;
    font-style: italic;
  }

  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1rem 2rem;
    background: white;
    border-top: 2px solid #ddd;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #4CAF50;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #45a049;
  }

  .btn-secondary {
    background: #f0f0f0;
    color: #333;
  }

  .btn-secondary:hover {
    background: #e0e0e0;
  }

  /* レスポンシブ対応 */
  @media (max-width: 1024px) {
    .content {
      grid-template-columns: 1fr;
    }

    .deck-area {
      max-height: 400px;
    }
  }

  @media (max-width: 768px) {
    .header,
    .toolbar,
    .content,
    .footer {
      padding: 1rem;
    }

    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .filters {
      flex-direction: column;
    }

    .search-input {
      max-width: 100%;
    }

    .cards-grid,
    .deck-cards {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }
  }

  /* ダークモード対応 */
  @media (prefers-color-scheme: dark) {
    .deck-builder {
      background: #1e1e1e;
    }

    .header,
    .toolbar,
    .card-list,
    .deck-area,
    .footer {
      background: #2a2a2a;
      border-color: #444;
    }

    .header h2,
    .card-list h3,
    .deck-area h3 {
      color: #fff;
    }

    .search-input,
    .category-select {
      background: #333;
      border-color: #555;
      color: #fff;
    }

    .deck-counter {
      background: #333;
      color: #ccc;
    }

    .btn-secondary {
      background: #333;
      color: #fff;
    }

    .btn-secondary:hover {
      background: #444;
    }
  }
</style>
