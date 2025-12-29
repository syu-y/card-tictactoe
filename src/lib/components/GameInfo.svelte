<!-- src/lib/components/GameInfo.svelte -->
<script lang="ts">
  import type { PlayerState, GamePhase } from '$lib/server/types/game.types';

  interface Props {
    myPlayer: PlayerState | null;
    opponent: PlayerState | null;
    turnCount: number;
    phase: GamePhase;
    isMyTurn: boolean;
  }

  let {
    myPlayer,
    opponent,
    turnCount,
    phase,
    isMyTurn
  }: Props = $props();

  // プレイヤー情報を整形
  function getPlayerInfo(player: PlayerState | null) {
    if (!player) return null;
    
    return {
      mark: player.mark,
      deckCount: player.deck.length,
      handCount: player.hand.length,
      discardCount: player.discardPile.length,
      hasSkipNextPlace: player.skipNextPlace,
      hasIgnoreCardLimit: player.ignoreCardLimit,
      hasNoMoreCard: player.noMoreCardThisTurn,
    };
  }

  let myInfo = $derived(getPlayerInfo(myPlayer));
  let opponentInfo = $derived(getPlayerInfo(opponent));
</script>

<div class="game-info">
  <div class="info-section turn-info">
    <h3>ゲーム情報</h3>
    <div class="info-grid">
      <div class="info-item">
        <span class="label">ターン数</span>
        <span class="value">{turnCount}</span>
      </div>
      <div class="info-item">
        <span class="label">フェーズ</span>
        <span class="value phase-value">
          {#if phase === 'WAITING'}
            待機中
          {:else if phase === 'DECK_SELECT'}
            デッキ選択
          {:else if phase === 'CARD'}
            カード
          {:else if phase === 'PLACE'}
            配置
          {:else if phase === 'GAME_OVER'}
            終了
          {/if}
        </span>
      </div>
    </div>
  </div>

  {#if myInfo}
    <div class="info-section player-info" class:active={isMyTurn}>
      <h3>あなた ({myInfo.mark})</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">山札</span>
          <span class="value">{myInfo.deckCount}枚</span>
        </div>
        <div class="info-item">
          <span class="label">手札</span>
          <span class="value">{myInfo.handCount}枚</span>
        </div>
        <div class="info-item">
          <span class="label">捨て札</span>
          <span class="value">{myInfo.discardCount}枚</span>
        </div>
      </div>
      
      {#if myInfo.hasSkipNextPlace || myInfo.hasIgnoreCardLimit || myInfo.hasNoMoreCard}
        <div class="status-effects">
          {#if myInfo.hasSkipNextPlace}
            <span class="effect negative">🚫 次の配置スキップ</span>
          {/if}
          {#if myInfo.hasIgnoreCardLimit}
            <span class="effect positive">✨ カード制限無視</span>
          {/if}
          {#if myInfo.hasNoMoreCard}
            <span class="effect negative">⛔ カード使用不可</span>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  {#if opponentInfo}
    <div class="info-section opponent-info" class:active={!isMyTurn}>
      <h3>相手 ({opponentInfo.mark})</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">山札</span>
          <span class="value">{opponentInfo.deckCount}枚</span>
        </div>
        <div class="info-item">
          <span class="label">手札</span>
          <span class="value">{opponentInfo.handCount}枚</span>
        </div>
        <div class="info-item">
          <span class="label">捨て札</span>
          <span class="value">{opponentInfo.discardCount}枚</span>
        </div>
      </div>

      {#if opponentInfo.hasSkipNextPlace || opponentInfo.hasIgnoreCardLimit || opponentInfo.hasNoMoreCard}
        <div class="status-effects">
          {#if opponentInfo.hasSkipNextPlace}
            <span class="effect negative">🚫 次の配置スキップ</span>
          {/if}
          {#if opponentInfo.hasIgnoreCardLimit}
            <span class="effect positive">✨ カード制限無視</span>
          {/if}
          {#if opponentInfo.hasNoMoreCard}
            <span class="effect negative">⛔ カード使用不可</span>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .game-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    max-width: 400px;
  }

  .info-section {
    background: white;
    border: 2px solid #ddd;
    border-radius: 8px;
    padding: 1rem;
    transition: all 0.3s ease;
  }

  .info-section.active {
    border-color: #4CAF50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }

  .info-section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #333;
  }

  .info-section.active h3 {
    color: #4CAF50;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 0.75rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .label {
    font-size: 0.75rem;
    color: #666;
    font-weight: 600;
  }

  .value {
    font-size: 1.1rem;
    font-weight: bold;
    color: #333;
  }

  .phase-value {
    color: #2196F3;
  }

  .status-effects {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .effect {
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    display: inline-block;
  }

  .effect.positive {
    background: #d4edda;
    color: #155724;
  }

  .effect.negative {
    background: #f8d7da;
    color: #721c24;
  }

  .turn-info {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: #764ba2;
  }

  .turn-info h3,
  .turn-info .label,
  .turn-info .value {
    color: white;
  }

  .player-info {
    background: #e3f2fd;
  }

  .opponent-info {
    background: #fff3e0;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .game-info {
      max-width: 100%;
      padding: 0.5rem;
    }

    .info-section {
      padding: 0.75rem;
    }

    .info-section h3 {
      font-size: 0.9rem;
    }

    .info-grid {
      gap: 0.5rem;
    }

    .label {
      font-size: 0.7rem;
    }

    .value {
      font-size: 1rem;
    }

    .effect {
      font-size: 0.7rem;
      padding: 0.3rem 0.5rem;
    }
  }

  /* ダークモード対応 */
  @media (prefers-color-scheme: dark) {
    .info-section {
      background: #2a2a2a;
      border-color: #444;
    }

    .info-section h3 {
      color: #fff;
    }

    .label {
      color: #aaa;
    }

    .value {
      color: #fff;
    }

    .player-info {
      background: #1a3a4a;
    }

    .opponent-info {
      background: #4a3a1a;
    }
  }
</style>
