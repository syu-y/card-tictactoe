<script lang="ts">
  import type { CellState, Position } from '$lib/server/types/game.types';

  interface Props {
    cell: CellState;
    position: Position;
    isClickable?: boolean;
    isHighlighted?: boolean;
    isWinningCell?: boolean;
    onclick?: (position: Position) => void;
  }

  let {
    cell,
    position,
    isClickable = false,
    isHighlighted = false,
    isWinningCell = false,
    onclick
  }: Props = $props();

  function handleClick() {
    if (isClickable && onclick) {
      onclick(position);
    }
  }

  // セルの状態に応じたスタイルクラス
  let cellClasses = $derived([
    'cell',
    cell.mark !== 'E' ? 'has-mark' : 'empty',
    isClickable ? 'clickable' : '',
    isHighlighted ? 'highlighted' : '',
    isWinningCell ? 'winning' : '',
    cell.lockT > 0 ? 'locked' : '',
    cell.protectT > 0 ? 'protected' : '',
  ].filter(Boolean).join(' '));

  // マークの表示
  let markDisplay = $derived(cell.mark === 'E' ? '' : cell.mark);

  // 状態異常の表示
  let statusEffects = $derived([
    cell.lockT > 0 ? `🔒${cell.lockT}` : '',
    cell.protectT > 0 ? `🛡️${cell.protectT}` : '',
    cell.noLineT > 0 ? `🚫${cell.noLineT}` : '',
    cell.wildT > 0 ? '🌟' : '',
  ].filter(Boolean));
</script>

<button
  class={cellClasses}
  onclick={handleClick}
  disabled={!isClickable}
  type="button"
>
  <div class="mark">{markDisplay}</div>
  
  {#if statusEffects.length > 0}
    <div class="status-effects">
      {#each statusEffects as effect}
        <span class="effect">{effect}</span>
      {/each}
    </div>
  {/if}

  <div class="position-info">
    {position.row},{position.col}
  </div>
</button>

<style>
  .cell {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    border: 2px solid #333;
    background: white;
    cursor: default;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    font-family: Arial, sans-serif;
  }

  .cell:hover {
    transform: scale(1.02);
  }

  .cell.clickable {
    cursor: pointer;
    border-color: #4CAF50;
  }

  .cell.clickable:hover {
    background: #e8f5e9;
    border-width: 3px;
  }

  .cell.highlighted {
    background: #fff3cd;
    border-color: #ffc107;
  }

  .cell.winning {
    background: #c8e6c9;
    border-color: #4CAF50;
    animation: pulse 1s infinite;
  }

  .cell.locked {
    background: #ffebee;
    opacity: 0.7;
  }

  .cell.protected {
    background: #e3f2fd;
    border-color: #2196F3;
  }

  .mark {
    font-size: 3rem;
    font-weight: bold;
    line-height: 1;
    user-select: none;
  }

  .cell.has-mark .mark {
    color: #333;
  }

  .cell .mark:empty::before {
    content: '';
  }

  .status-effects {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.75rem;
  }

  .effect {
    background: rgba(255, 255, 255, 0.9);
    padding: 2px 4px;
    border-radius: 4px;
    white-space: nowrap;
  }

  .position-info {
    position: absolute;
    bottom: 2px;
    left: 4px;
    font-size: 0.65rem;
    color: #999;
    user-select: none;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .mark {
      font-size: 2rem;
    }

    .status-effects {
      font-size: 0.65rem;
    }

    .position-info {
      font-size: 0.55rem;
    }
  }

  /* ダークモード対応 */
  @media (prefers-color-scheme: dark) {
    .cell {
      background: #1e1e1e;
      border-color: #555;
    }

    .cell.has-mark .mark {
      color: #fff;
    }

    .cell.clickable:hover {
      background: #2d4a2d;
    }

    .effect {
      background: rgba(0, 0, 0, 0.7);
      color: white;
    }
  }
</style>
