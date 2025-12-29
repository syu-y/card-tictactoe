<!-- src/lib/components/Board.svelte -->
<script lang="ts">
  import type { BoardState, Position, GamePhase } from '$lib/server/types/game.types';
  import Cell from './Cell.svelte';

  interface Props {
    board: BoardState;
    phase: GamePhase;
    isMyTurn: boolean;
    winningLine?: Position[];
    selectedFromPosition?: Position | null;
    onCellClick?: (position: Position) => void;
  }

  let {
    board,
    phase,
    isMyTurn,
    winningLine = [],
    selectedFromPosition = null,
    onCellClick
  }: Props = $props();

  function handleCellClick(position: Position) {
    if (onCellClick) {
      onCellClick(position);
    }
  }

  // セルがクリック可能かチェック
  function isCellClickable(row: number, col: number): boolean {
    if (!isMyTurn) return false;
    
    // 配置フェーズの場合
    if (phase === 'PLACE') {
      const cell = board.cells[row][col];
      return cell.mark === 'E' && cell.lockT === 0;
    }
    
    // カードフェーズでもクリック可能にする（カードターゲット選択用）
    if (phase === 'CARD') {
      return true;
    }
    
    return false;
  }

  // セルが勝利ラインに含まれるかチェック
  function isWinningCell(row: number, col: number): boolean {
    return winningLine.some(pos => pos.row === row && pos.col === col);
  }

  // セルが選択されているかチェック
  function isSelectedFromCell(row: number, col: number): boolean {
    return selectedFromPosition !== null && 
          selectedFromPosition.row === row && 
          selectedFromPosition.col === col;
  }

  // グリッドのスタイルを動的に生成
  let gridStyle = $derived(`
    display: grid;
    grid-template-columns: repeat(${board.cols}, 1fr);
    grid-template-rows: repeat(${board.rows}, 1fr);
    gap: 4px;
    width: 100%;
    max-width: min(30vw, 30vh);
    aspect-ratio: ${board.cols} / ${board.rows};
  `);
</script>

<div class="board-container">
  <div class="board-info">
    <div class="size-indicator">
      盤面サイズ: {board.rows}×{board.cols}
    </div>
    <div class="phase-indicator">
      {#if phase === 'WAITING'}
        <span class="status waiting">待機中...</span>
      {:else if phase === 'DECK_SELECT'}
        <span class="status deck-select">デッキ選択中</span>
      {:else if phase === 'CARD'}
        <span class="status card-phase">カードフェーズ</span>
      {:else if phase === 'PLACE'}
        <span class="status place-phase">配置フェーズ</span>
      {:else if phase === 'GAME_OVER'}
        <span class="status game-over">ゲーム終了</span>
      {/if}
      
      {#if isMyTurn && phase !== 'GAME_OVER'}
        <span class="turn-indicator">あなたのターン</span>
      {/if}
    </div>
  </div>

  <div class="board" style={gridStyle}>
    {#each board.cells as row, rowIndex}
      {#each row as cell, colIndex}
        <Cell
          {cell}
          position={{ row: rowIndex, col: colIndex }}
          isClickable={isCellClickable(rowIndex, colIndex)}
          isHighlighted={isSelectedFromCell(rowIndex, colIndex)}
          isWinningCell={isWinningCell(rowIndex, colIndex)}
          onclick={handleCellClick}
        />
      {/each}
    {/each}
  </div>
</div>

<style>
  .board-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
  }

  .board-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: min(30vw, 30vh);
    padding: 0.5rem 1rem;
    background: #f5f5f5;
    border-radius: 8px;
    font-size: 0.9rem;
  }

  .size-indicator {
    font-weight: 600;
    color: #555;
  }

  .phase-indicator {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .status {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .status.waiting {
    background: #e0e0e0;
    color: #666;
  }

  .status.deck-select {
    background: #fff3cd;
    color: #856404;
  }

  .status.card-phase {
    background: #d1ecf1;
    color: #0c5460;
  }

  .status.place-phase {
    background: #d4edda;
    color: #155724;
  }

  .status.game-over {
    background: #f8d7da;
    color: #721c24;
  }

  .turn-indicator {
    padding: 0.25rem 0.75rem;
    background: #4CAF50;
    color: white;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.85rem;
    animation: glow 1.5s ease-in-out infinite;
  }

  .board {
    background: #e0e0e0;
    padding: 8px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
    }
    50% {
      box-shadow: 0 0 20px rgba(76, 175, 80, 0.8);
    }
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .board-container {
      padding: 0.5rem;
    }

    .board-info {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .phase-indicator {
      width: 100%;
      justify-content: space-between;
    }

    .status,
    .turn-indicator {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
    }
  }

  /* ダークモード対応 */
  @media (prefers-color-scheme: dark) {
    .board-info {
      background: #2a2a2a;
    }

    .size-indicator {
      color: #ccc;
    }

    .board {
      background: #333;
    }
  }
</style>
