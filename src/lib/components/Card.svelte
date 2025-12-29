<!-- src/lib/components/Card.svelte -->
<script lang="ts">
  import type { Card } from '$lib/server/types/game.types';
  import { getCard } from '$lib/utils/cardData';

  interface Props {
    cardId: number;
    isSelected?: boolean;
    isClickable?: boolean;
    isHidden?: boolean;
    onclick?: (cardId: number) => void;
  }

  let {
    cardId,
    isSelected = false,
    isClickable = true,
    isHidden = false,
    onclick
  }: Props = $props();

  let card = $derived(getCard(cardId));

  // デバッグ用ログ
  $effect(() => {
    console.log('Card component:', { cardId, card: card?.name });
  });

  function handleClick() {
    if (isClickable && !isHidden && onclick) {
      onclick(cardId);
    }
  }

  // カテゴリに応じた色
  function getCategoryColor(category: string): string {
    switch (category) {
      case '盤面操作':
        return '#2196F3'; // 青
      case '妨害':
        return '#f44336'; // 赤
      case '防御':
        return '#4CAF50'; // 緑
      case '補助':
        return '#FF9800'; // オレンジ
      default:
        return '#9E9E9E'; // グレー
    }
  }

  let categoryColor = $derived(card ? getCategoryColor(card.category) : '#9E9E9E');

  let cardClasses = $derived([
    'card',
    isSelected ? 'selected' : '',
    isClickable ? 'clickable' : '',
    isHidden ? 'hidden' : '',
  ].filter(Boolean).join(' '));
</script>

<button
  class={cardClasses}
  onclick={handleClick}
  disabled={!isClickable || isHidden}
  type="button"
  style="--category-color: {categoryColor}"
>
  {#if isHidden}
    <div class="card-back">
      <div class="card-back-pattern">?</div>
    </div>
  {:else if card}
    <div class="card-header">
      <div class="card-name">{card.name}</div>
      <div class="card-id">#{cardId}</div>
    </div>
    
    <div class="card-category" style="background-color: {categoryColor}">
      {card.category}
    </div>
    
    <div class="card-description">
      {card.description}
    </div>

    {#if card.isMultiStep}
      <div class="card-badge multi-step">2段階</div>
    {/if}

    {#if card.needsTarget}
      <div class="card-badge needs-target">要ターゲット</div>
    {/if}
  {:else}
    <div class="card-error">
      カード情報が見つかりません
    </div>
  {/if}
</button>

<style>
  .card {
    position: relative;
    width: 180px;
    height: 260px;
    background: white;
    border: 2px solid #ddd;
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: all 0.2s ease;
    cursor: default;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .card.clickable {
    cursor: pointer;
  }

  .card.clickable:hover {
    transform: translateY(-8px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    border-color: var(--category-color);
  }

  .card.selected {
    border-width: 3px;
    border-color: var(--category-color);
    box-shadow: 0 0 0 3px rgba(var(--category-color-rgb), 0.3);
    transform: translateY(-4px);
  }

  .card.hidden {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: #764ba2;
  }

  .card-back {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-back-pattern {
    font-size: 6rem;
    color: rgba(255, 255, 255, 0.3);
    font-weight: bold;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }

  .card-name {
    font-size: 1rem;
    font-weight: bold;
    color: #333;
    flex: 1;
    line-height: 1.2;
  }

  .card-id {
    font-size: 0.75rem;
    color: #999;
    font-weight: 600;
  }

  .card-category {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    text-align: center;
    align-self: flex-start;
  }

  .card-description {
    flex: 1;
    font-size: 0.75rem;
    line-height: 1.4;
    color: #555;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .card-description::-webkit-scrollbar {
    width: 4px;
  }

  .card-description::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 2px;
  }

  .card-badge {
    position: absolute;
    bottom: 8px;
    font-size: 0.65rem;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 600;
    color: white;
  }

  .card-badge.multi-step {
    right: 8px;
    background: #9C27B0;
  }

  .card-badge.needs-target {
    left: 8px;
    background: #FF5722;
  }

  .card-error {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f44336;
    font-size: 0.85rem;
    text-align: center;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .card {
      width: 140px;
      height: 200px;
      padding: 8px;
      gap: 6px;
    }

    .card-name {
      font-size: 0.85rem;
    }

    .card-description {
      font-size: 0.65rem;
    }

    .card-category {
      font-size: 0.65rem;
      padding: 3px 6px;
    }
  }

  /* ダークモード対応 */
  @media (prefers-color-scheme: dark) {
    .card {
      background: #2a2a2a;
      border-color: #444;
    }

    .card-name {
      color: #fff;
    }

    .card-description {
      color: #ccc;
    }

    .card-id {
      color: #888;
    }

    .card.clickable:hover {
      background: #333;
    }
  }
</style>
