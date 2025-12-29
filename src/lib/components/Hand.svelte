<!-- src/lib/components/Hand.svelte -->
<script lang="ts">
  import Card from './Card.svelte';

  interface Props {
    cards: number[];
    selectedCardIndex?: number | null;
    isMyTurn: boolean;
    phase: string;
    waitingForTarget?: boolean;
    onCardSelect?: (cardId: number | null, index: number | null) => void;
    onSkipCardPhase?: () => void;
    onCancelCardSelect?: () => void;
    onUseCard?: () => void;
  }

  let {
    cards,
    selectedCardIndex = null,
    isMyTurn,
    phase,
    waitingForTarget = false,
    onCardSelect,
    onSkipCardPhase,
    onCancelCardSelect,
    onUseCard
  }: Props = $props();

  function handleCardClick(cardId: number, index: number) {
    console.log('🎴 Card clicked in Hand:', cardId, 'at index:', index);
    
    // 対象選択中はカードをクリックできない
    if (waitingForTarget) {
      console.log('⚠️ Cannot select card while waiting for target');
      return;
    }

    if (onCardSelect) {
      // 既に選択されているカードをクリックした場合は選択解除
      if (selectedCardIndex === index) {
        console.log('Deselecting card');
        onCardSelect(null, null);
      } else {
        console.log('Selecting card:', cardId, 'at index:', index);
        onCardSelect(cardId, index);
      }
    } else {
      console.error('⚠️ onCardSelect is not defined!');
    }
  }

  // カードがクリック可能かチェック
  function isCardClickable(): boolean {
    return isMyTurn && phase === 'CARD';
  }

  let handClasses = $derived([
    'hand',
    cards.length > 5 ? 'many-cards' : '',
  ].filter(Boolean).join(' '));

  // デバッグ用
  $effect(() => {
    console.log('Hand component:', { 
      cards, 
      cardsLength: cards.length,
      selectedCardIndex,
      isMyTurn,
      phase 
    });
  });
</script>

<div class="hand-container">
  <div class="hand-header">
    <h3>手札 ({cards.length}枚)</h3>
    <!-- ボタン群 -->
    {#if isMyTurn && phase === 'CARD'}
      <div class="hand-actions">
        {#if selectedCardIndex !== null}
          <!-- カード選択済み -->
          {#if onUseCard}
            <button onclick={onUseCard} class="btn btn-primary btn-sm">
              カードを使用
            </button>
          {/if}
          {#if onCancelCardSelect}
            <button onclick={onCancelCardSelect} class="btn btn-secondary btn-sm">
              キャンセル
            </button>
          {/if}
        {:else}
          <!-- カード未選択 -->
          {#if onSkipCardPhase}
            <button onclick={onSkipCardPhase} class="btn btn-secondary btn-sm">
              カードフェーズをスキップ
            </button>
          {/if}
        {/if}
      </div>
    {/if}
    {#if !isMyTurn}
      <span class="status-message">相手のターン</span>
    {:else if phase !== 'CARD'}
      <span class="status-message">配置フェーズ</span>
    {:else}
      <span class="status-message active">カードを選択</span>
    {/if}
  </div>

  <div class={handClasses}>
    {#if cards.length === 0}
      <div class="empty-hand">
        <p>手札がありません</p>
      </div>
    {:else}
      {#each cards as cardId, index (`card-${index}`)}
        {#if cardId !== undefined && cardId !== 0}
          <div class="card-wrapper">
            <Card
              {cardId}
              isSelected={selectedCardIndex === index}
              isClickable={isCardClickable()}
              onclick={() => handleCardClick(cardId, index)}
            />
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</div>

<style>
  .hand-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .hand-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .hand-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .hand-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-secondary {
    background: white;
    color: #667eea;
    border: 2px solid #667eea;
  }

  .btn-secondary:hover {
    background: #f0f4ff;
  }

  .status-message {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    background: #e0e0e0;
    color: #666;
  }

  .status-message.active {
    background: #4CAF50;
    color: white;
    animation: pulse-text 1.5s ease-in-out infinite;
  }

  .hand {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: #fafafa;
    border-radius: 0 0 8px 8px;
    overflow-x: auto;
    min-height: 280px;
    align-items: center;
  }

  .hand.many-cards {
    gap: 8px;
  }

  .hand::-webkit-scrollbar {
    height: 8px;
  }

  .hand::-webkit-scrollbar-track {
    background: #e0e0e0;
    border-radius: 4px;
  }

  .hand::-webkit-scrollbar-thumb {
    background: #bdbdbd;
    border-radius: 4px;
  }

  .hand::-webkit-scrollbar-thumb:hover {
    background: #9e9e9e;
  }

  .card-wrapper {
    flex-shrink: 0;
  }

  .empty-hand {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-style: italic;
  }

  @keyframes pulse-text {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .hand-header {
      padding: 0.5rem;
    }

    .hand-header h3 {
      font-size: 1rem;
    }

    .status-message {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
    }

    .hand {
      padding: 12px;
      gap: 8px;
      min-height: 220px;
    }

    .hand.many-cards {
      gap: 6px;
    }
  }

  /* ダークモード対応 */
  @media (prefers-color-scheme: dark) {
    .hand-header {
      background: #2a2a2a;
      border-bottom-color: #444;
    }

    .hand-header h3 {
      color: #fff;
    }

    .hand {
      background: #1e1e1e;
    }

    .empty-hand {
      color: #666;
    }

    .status-message {
      background: #333;
      color: #ccc;
    }

    .status-message.active {
      background: #4CAF50;
      color: white;
    }
  }
</style>
