<!-- src/routes/game/[roomId]/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { websocketStore } from '$lib/stores/websocketStore';
  import { gameStore, myPlayer, opponent, board, currentPhase, winner } from '$lib/stores/gameStore';
  import Board from '$lib/components/Board.svelte';
  import Hand from '$lib/components/Hand.svelte';
  import GameInfo from '$lib/components/GameInfo.svelte';
  import DeckBuilder from '$lib/components/DeckBuilder.svelte';
  import type { Position, CardParams, CardCategory } from '$lib/server/types/game.types';
  import { getCard } from '$lib/utils/cardData';

  // 基本情報
  let roomId = $state($page.params.roomId);
  let playerId = $state('');
  let playerName = $state('');
  let showDeckBuilder = $state(true);
  let errorMessage = $state('');
  let rematchRequested = $state(false);

  // カード・対象選択情報
  let rowColList = $state([1,2,3]);
  let selectedCard = $state<number | null>(null);
  let selectedCardIndex = $state<number | null>(null);
  let selectedPosition = $state<{ row: number; col: number } | null>(null);
  let fromPosition = $state<{ row: number; col: number } | null>(null);
  let toPosition = $state<{ row: number; col: number } | null>(null);
  let waitingForTarget = $state(false);
  let targetType = $state<'position' | 'fromTo' | 'rowCol' | 'handSelect' |
    'searchPick' | 'searchCategory' | 'predictStart'| 'predictPick' | null>(null);
  let selectedDirection = $state<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null>(null);
  let selectedRowCol = $state<'ROW' | 'COL' | null>(null);
  let selectedRowOrColIndex = $state<number | null>(1);
  let selectedHandIndices = $state<number[]>([]);
  let selectedCategory: CardCategory | null = null;
  let searchCandidates = $state<number[]>([]);
  let selectedCardFromSearch = $state<number | null>(null);
  let predictCandidates: number[] = []; // 予知
  
  // ゲームストアの状態を購読
  let gameState = $state($gameStore);
  let myPlayerState = $state($myPlayer);
  let opponentState = $state($opponent);
  let boardState = $state($board);
  let phase = $state($currentPhase);
  let winnerState = $state($winner);

  /**
   * 監視
   */
  // 再戦開始の監視
  let hasResetForRematch = false;

  $effect(() => {
    gameState = $gameStore;
    myPlayerState = $myPlayer;
    opponentState = $opponent;
    boardState = $board;
    phase = $currentPhase;
    winnerState = $winner;
    errorMessage = $gameStore.error || '';
  });

  // マルチステップカードの第2段階を自動表示
  $effect(() => {
    const player = myPlayerState;
    if (!player?.pendingCardAction) return;

    const { step, candidates = [] } = player.pendingCardAction;
    
    if (step === 'SEARCH_START' && selectedCard === 23) {
      searchCandidates = candidates;
      targetType = 'searchPick';
      waitingForTarget = true;
      console.log('🔄 Auto-showing search step 2');
    } else if (step === 'PREDICT_START' && selectedCard === 24) {
      predictCandidates = candidates;
      targetType = 'predictPick';
      waitingForTarget = true;
      console.log('🔄 Auto-showing predict step 2');
    }
  });

  // 相手退室の監視
  $effect(() => {
    if ($gameStore.opponentLeft) {
      setTimeout(() => {
        goto('/');
      }, 3000);
    }
  });

  // 再戦開始の監視
  $effect(() => {
    if ($gameStore.rematchStarted && !hasResetForRematch) {
      console.log('🔄 Rematch started, resetting local state');
      rematchRequested = false;
      hasResetForRematch = true;

      // 少し待ってからリセット（GAME_STATEを受信した後）
      setTimeout(() => {
        // rematchStartedだけをfalseに戻す
        gameStore.clearError(); // エラーもクリア
        hasResetForRematch = false;
      }, 500);
    } else if (!$gameStore.rematchStarted) {
      hasResetForRematch = false;
    }
  });

  // ゲーム終了時にローカルの再戦状態をリセット
  $effect(() => {
    if (winnerState) {
      rematchRequested = false;
    }
  });

  /**
   * 入室時のコールバック
   */
  onMount(() => {
    // プレイヤーIDを生成（通常は認証システムから取得）
    playerId = `player_${Math.random().toString(36).substr(2, 9)}`;
    playerName = `Player ${playerId.substr(-4)}`;

    // WebSocket接続
    websocketStore.connect();

    // 少し遅延させてから参加（接続確立を待つ）
    setTimeout(() => {
      gameStore.joinRoom(roomId, playerId, playerName);
    }, 500);
  });

  /**
   * 退室時のコールバック
   */
  onDestroy(() => {
    gameStore.leaveRoom();
  });

  /**
   * メソッド
   */
  // デッキ構築完了
  function handleDeckComplete(deck: number[]) {
    gameStore.setDeck(deck);
    showDeckBuilder = false;
  }

  function requestRematch() {
    gameStore.requestRematch();
    rematchRequested = true;
  }

  // カード選択ハンドラ（カードを選択するだけ）
  const handleCardSelect = (cardId: number | null, index: number | null) => {
    console.log('🎯 Card selected:', cardId, 'at index:', index);

    if (cardId === null) {
      selectedCard = null;
      selectedCardIndex = null;
      waitingForTarget = false;
      targetType = null;
      selectedPosition = null;
      fromPosition = null;
      toPosition = null;
      selectedDirection = null;
      selectedRowCol = null;
      selectedRowOrColIndex = null;
      gameStore.selectCard(null);
      return;
    }

    selectedCard = cardId;
    selectedCardIndex = index;
    gameStore.selectCard(cardId);
    console.log('✅ Card selected, waiting for "Use Card" button');
  };

  // 「カード使用」ボタンを押したときの処理
  const startCardUse = async () => {
    if (selectedCard === null) return;

    const card = getCard(selectedCard);
    console.log('📋 Starting card use:', { cardId: selectedCard, name: card?.name, needsTarget: card?.needsTarget });
    
    if (!card) return;

    if (card.needsTarget) {
      if ([20].includes(selectedCard)) {
        // リロール: 手札選択UI
        targetType = 'handSelect';
        waitingForTarget = true;
        console.log('⏳ Waiting for hand card selection (Reroll)');
      } else if ([23].includes(selectedCard)) {
        // サーチ: カテゴリ選択
        const player = myPlayerState;
        if (player?.pendingCardAction?.step === 'SEARCH_START') {
          // ステップ2: 候補から選択
          searchCandidates = player.pendingCardAction.candidates || [];
          targetType = 'searchPick';
          waitingForTarget = true;
          console.log('⏳ Waiting for card selection from candidates');
        } else {
          // ステップ1: カテゴリ選択
          targetType = 'searchCategory';
          waitingForTarget = true;
          console.log('⏳ Waiting for category selection');
        }
      } else if ([24].includes(selectedCard)) {
        // 予知: 山札確認
        const player = myPlayerState;
        if (player?.pendingCardAction?.step === 'PREDICT_START') {
          // ステップ2: 候補から選択
          predictCandidates = player.pendingCardAction.candidates || [];
          targetType = 'predictPick';
          waitingForTarget = true;
          console.log('⏳ Waiting for card selection from deck preview');
        } else {
          // ステップ1: 山札確認を開始
          targetType = 'predictStart';
          waitingForTarget = true;
          console.log('⏳ Starting predict...');
          // 即座に実行（パラメータ不要）
          executeCardUse();
        }
      } else if ([4, 5, 6, 10, 27].includes(selectedCard)) {
        // スライド、テレポート、強制移動、入替
        targetType = 'fromTo';
        waitingForTarget = true;
        console.log('⏳ Waiting for FROM position');
      } else if ([1, 2, 3].includes(selectedCard)) {
        // 盤面拡張、盤面縮小、プッシュ
        targetType = 'rowCol';
        waitingForTarget = true;
        console.log('⏳ Waiting for ROW/COL selection');
      } else {
        // その他の位置指定カード
        targetType = 'position';
        waitingForTarget = true;
        console.log('⏳ Waiting for target position');
      }
    } else {
      // ターゲット不要のカードはすぐ実行
      console.log('✅ No target needed, executing immediately');
      executeCardUse();
    }
  };

  // マスクリック処理
  const handleCellClick = (position: { row: number; col: number }) => {
    console.log('Cell clicked:', position);

    if (waitingForTarget && selectedCard !== null) {
      if (targetType === 'position') {
        selectedPosition = position;
        executeCardUse();
      } else if (targetType === 'fromTo') {
        if (!fromPosition) {
          fromPosition = position;
          console.log('✅ FROM position selected, waiting for TO position');
        } else {
          toPosition = position;
          executeCardUse();
        }
      }
      return;
    }

    if (phase === 'PLACE') {
      gameStore.placeMark(position);
    }
  };

  // カードを実際に使用する
  function executeCardUse() {
    if (selectedCard === null) return;

    const params: any = {};

    if (selectedPosition) params.position = selectedPosition;
    if (fromPosition && toPosition) {
      params.fromPosition = fromPosition;
      params.toPosition = toPosition;
    }
    if (selectedDirection) params.direction = selectedDirection;
    if (selectedRowCol) params.rowCol = selectedRowCol;
    if (selectedRowOrColIndex !== null) params.rowOrCol = selectedRowOrColIndex;
    if (selectedHandIndices.length > 0) params.discardIndices = selectedHandIndices;
    if (selectedCategory) params.category = selectedCategory;
    if (selectedCardFromSearch !== null) params.selectedCardId = selectedCardFromSearch;

    console.log('🃏 Using card:', selectedCard, 'with params:', params);
    gameStore.useCard(selectedCard, params);

    // マルチステップカードの第1段階かチェック
    const isMultiStepFirstPhase = 
      (selectedCard === 23 && selectedCategory && !selectedCardFromSearch) ||
      (selectedCard === 24 && !selectedCardFromSearch && targetType === 'predictStart');
  
    // 状態をリセット
    waitingForTarget = false;
    targetType = null;
    selectedPosition = null;
    fromPosition = null;
    toPosition = null;
    selectedDirection = null;
    selectedRowCol = null;
    selectedRowOrColIndex = null;
    selectedHandIndices = [];
    selectedCategory = null;
    selectedCardFromSearch = null;
    searchCandidates = [];
    predictCandidates = [];

    // マルチステップカードの第1段階の場合、第2段階のUIを自動表示
    if (!isMultiStepFirstPhase) {
      selectedCard = null;
      selectedCardIndex = null;
    }
  }

  // カードフェーズをスキップ
  function skipCardPhase() {
    gameStore.endTurn();
  }

  // ゲームを退出
  function leaveGame() {
    if (confirm('ゲームを退出しますか？')) {
      // サーバーに退室を通知
      gameStore.leaveRoom();
      // トップページに戻る
      goto('/');
    }
  }
</script>

<svelte:head>
  <title>Card Tic-Tac-Toe - Room {roomId}</title>
</svelte:head>

{#if showDeckBuilder}
  <DeckBuilder
    onDeckComplete={handleDeckComplete}
    onCancel={() => goto('/')}
  />
{:else}
  <div class="game-page">
    <!-- ヘッダー -->
    <header class="game-header">
      <h1>Card Tic-Tac-Toe</h1>
      <div class="room-info">
        <span>Room: {roomId}</span>
      </div>
      <button onclick={leaveGame} class="btn-leave">退出</button>
    </header>

    <!-- エラーメッセージ -->
    {#if errorMessage}
      <div class="error-banner">
        {errorMessage}
        <button onclick={() => gameStore.clearError()}>×</button>
      </div>
    {/if}

    <!-- 勝利表示 -->
    {#if winnerState}
      <div class="winner-banner" class:my-win={winnerState.isMyWin}>
        {#if winnerState.isMyWin}
          🎉 勝利！ 🎉
        {:else}
          😔 敗北...
        {/if}
      </div>
    {/if}

    <!-- 再戦UI -->
    {#if winnerState && !$gameStore.opponentLeft}
      <div class="rematch-section">
        {#if $gameStore.rematchRequested}
          <div class="rematch-waiting">
            🔄 相手が再戦を希望しています
          </div>
        {/if}
        
        {#if rematchRequested}
          <div class="rematch-waiting">
            ⏳ 相手の応答を待っています...
          </div>
        {:else}
          <button onclick={requestRematch} class="btn-rematch">
            🔄 再戦する
          </button>
        {/if}
      </div>
    {/if}

    <!-- メインコンテンツ -->
    <div class="game-content">
      <!-- 左サイドバー: ゲーム情報 -->
      <aside class="sidebar left">
        {#if gameState.gameState && myPlayerState && opponentState}
          <GameInfo
            myPlayer={myPlayerState}
            opponent={opponentState}
            turnCount={gameState.gameState.turnCount}
            phase={phase}
            isMyTurn={gameState.isMyTurn}
          />
        {/if}
      </aside>

      <!-- ターゲット選択ヒント（最上部に表示） -->
      {#if waitingForTarget && phase === 'CARD' && $gameStore.isMyTurn}
        <div class="target-hint-overlay">
          <!-- ターゲット選択中 -->
          <div class="target-hint">
            {#if targetType === 'handSelect'}
              <!-- 手札選択（リロール用） -->
              <div>⏳ 捨てるカードを選択してください（最大2枚）</div>
              <div class="hand-selection">
                {#if myPlayerState}
                  {#each myPlayerState.hand as cardId, index}
                    {#if cardId !== undefined && cardId !== 0 && index !== selectedCardIndex}
                      <button 
                        onclick={() => {
                          console.log('🎯 Hand card clicked:', { index, cardId, selectedCardIndex, handLength: myPlayerState?.hand.length });
                          if (selectedHandIndices.includes(index)) {
                            selectedHandIndices = selectedHandIndices.filter(i => i !== index);
                          } else if (selectedHandIndices.length < 2) {
                            selectedHandIndices = [...selectedHandIndices, index];
                          }
                          console.log('📋 Selected indices:', selectedHandIndices);
                        }}
                        class="hand-card-btn {selectedHandIndices.includes(index) ? 'selected' : ''}"
                      >
                        カード{index + 1} ({getCard(cardId)?.name})
                      </button>
                    {/if}
                  {/each}
                {/if}
              </div>
              <button 
                onclick={() => {
                  executeCardUse();
                }}
                class="btn btn-primary"
                disabled={selectedHandIndices.length === 0}
              >
                確定（{selectedHandIndices.length}枚）
              </button>
            {:else if targetType === 'position'}
              ⏳ ターゲットのマスを選択してください
            {:else if targetType === 'fromTo'}
              {#if !fromPosition}
                ⏳ 移動元のマスを選択してください
              {:else}
                ⏳ 移動先のマスを選択してください
              {/if}
            {:else if targetType === 'rowCol'}
              <div class="selection-buttons">
                <div>行列を選択:</div>
                <button onclick={() => { selectedRowCol = 'ROW'; 
                  rowColList = [...Array(gameState.gameState?.board.rows)].map((_, i) => i) }} 
                  class="btn {selectedRowCol === 'ROW' ? 'btn-primary' : 'btn-secondary'}">
                  行
                </button>
                <button onclick={() => { selectedRowCol = 'COL'; 
                  rowColList = [...Array(gameState.gameState?.board.cols)].map((_, i) => i) }}
                  class="btn {selectedRowCol === 'COL' ? 'btn-primary' : 'btn-secondary'}">
                  列
                </button>
                {#if selectedRowCol}
                  {#if selectedCard && [3].includes(selectedCard)}
                    <div>行/列番号を選択:</div>
                    <select bind:value={selectedRowOrColIndex}
                      onchange={() => { console.log('Selected row/col index:', selectedRowOrColIndex) }}>
                      {#each rowColList as value }
                        <option value={value}>{value}</option>
                      {/each}
                    </select>
                  {/if}
                  <div>方向を選択:</div>
                  {#if selectedRowCol == 'ROW' && selectedCard}
                    {#if [1, 2].includes(selectedCard)}
                      <!-- 盤面拡張・縮小：行の場合は上下 -->
                      <button onclick={() => { selectedDirection = 'UP'; executeCardUse(); }} class="btn btn-secondary">↑</button>
                      <button onclick={() => { selectedDirection = 'DOWN'; executeCardUse(); }} class="btn btn-secondary">↓</button>
                    {:else}
                      <!-- プッシュ：行の場合は左右 -->
                      <button onclick={() => { selectedDirection = 'LEFT'; executeCardUse(); }} class="btn btn-secondary">←</button>
                      <button onclick={() => { selectedDirection = 'RIGHT'; executeCardUse(); }} class="btn btn-secondary">→</button>
                    {/if}
                  {/if}
                  {#if selectedRowCol == 'COL' && selectedCard}
                    {#if [1, 2].includes(selectedCard)}
                      <!-- 盤面拡張・縮小：列の場合は左右 -->
                      <button onclick={() => { selectedDirection = 'LEFT'; executeCardUse(); }} class="btn btn-secondary">←</button>
                      <button onclick={() => { selectedDirection = 'RIGHT'; executeCardUse(); }} class="btn btn-secondary">→</button>
                    {:else}
                      <!-- プッシュ：列の場合は上下 -->
                      <button onclick={() => { selectedDirection = 'UP'; executeCardUse(); }} class="btn btn-secondary">↑</button>
                      <button onclick={() => { selectedDirection = 'DOWN'; executeCardUse(); }} class="btn btn-secondary">↓</button>
                    {/if}
                  {/if}
                {/if}
              </div>
            {:else if targetType === 'searchCategory'}
              <!-- サーチ：カテゴリ選択 -->
              <div>📚 サーチするカテゴリを選択してください</div>
              <div class="selection-buttons">
                <button onclick={() => { selectedCategory = '盤面操作'; executeCardUse(); }} class="btn btn-primary">
                  盤面操作
                </button>
                <button onclick={() => { selectedCategory = '妨害'; executeCardUse(); }} class="btn btn-primary">
                  妨害
                </button>
                <button onclick={() => { selectedCategory = '防御'; executeCardUse(); }} class="btn btn-primary">
                  防御
                </button>
                <button onclick={() => { selectedCategory = '補助'; executeCardUse(); }} class="btn btn-primary">
                  補助
                </button>
              </div>
            {:else if targetType === 'searchPick'}
              <!-- サーチ：候補から選択 -->
              <div>📚 候補から1枚選択してください</div>
              <div class="hand-selection">
                {#each searchCandidates as candidateId}
                  <button 
                    onclick={() => {
                      selectedCardFromSearch = candidateId;
                      executeCardUse();
                    }}
                    class="btn btn-primary"
                  >
                    {getCard(candidateId)?.name || `カード${candidateId}`}
                  </button>
                {/each}
              </div>
            {:else if targetType === 'predictPick'}
              <!-- 予知：山札上位から選択 -->
              <div>🔮 山札の上から1枚選択してください</div>
              <div class="hand-selection">
                {#each predictCandidates as candidateId, index}
                  <button 
                    onclick={() => {
                      selectedCardFromSearch = candidateId;
                      executeCardUse();
                    }}
                    class="btn btn-primary card-preview-btn"
                  >
                    <div class="card-preview-index">山札 {index + 1}枚目</div>
                    <div class="card-preview-name">{getCard(candidateId)?.name || `カード${candidateId}`}</div>
                  </button>
                {/each}
              </div>
            {/if}
            <button onclick={() => handleCardSelect(null, null)} class="btn btn-secondary">キャンセル</button>
          </div>
        </div>
      {/if}

      <!-- 中央: 盤面 -->
      <main class="main-area">
        {#if boardState}
          <Board
            board={boardState}
            {phase}
            isMyTurn={gameState.isMyTurn}
            winningLine={gameState.gameState?.winningLine}
            selectedFromPosition={fromPosition}
            onCellClick={handleCellClick}
          />
        {:else}
          <div class="loading">
            <p>ゲームを読み込み中...</p>
          </div>
        {/if}
      </main>

      <!-- 右サイドバー: 相手情報など -->
      <aside class="sidebar right">
        <div class="opponent-area">
          <h3>相手の手札</h3>
          {#if opponentState}
            <div class="opponent-hand-count">
              {opponentState.hand.length} 枚
            </div>
          {/if}
        </div>
      </aside>
    </div>

    <!-- 下部: 自分の手札 -->
    <footer class="game-footer">
      {#if myPlayerState}
      <Hand
        cards={myPlayerState.hand || []}
        selectedCardIndex={selectedCardIndex}
        isMyTurn={$gameStore.isMyTurn}
        phase={phase || 'WAITING'}
        waitingForTarget={waitingForTarget}
        onCardSelect={handleCardSelect}
        onSkipCardPhase={skipCardPhase}
        onCancelCardSelect={() => handleCardSelect(null, null)}
        onUseCard={startCardUse}
      />
      {/if}
    </footer>
  </div>
{/if}

<style>
  .game-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f0f0f0;
  }

  .game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    border-bottom: 2px solid #ddd;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .game-header h1 {
    margin: 0;
    font-size: 1.5rem;
    color: #333;
  }

  .room-info {
    font-size: 0.9rem;
    color: #666;
    font-weight: 600;
  }

  .btn-leave {
    padding: 0.5rem 1rem;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .btn-leave:hover {
    background: #d32f2f;
  }

  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: #f8d7da;
    color: #721c24;
    border-bottom: 2px solid #f5c6cb;
  }

  .error-banner button {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #721c24;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .winner-banner {
    padding: 2rem;
    text-align: center;
    font-size: 2rem;
    font-weight: bold;
    background: #f8d7da;
    color: #721c24;
    border-bottom: 2px solid #f5c6cb;
  }

  .winner-banner.my-win {
    background: #d4edda;
    color: #155724;
    border-bottom-color: #c3e6cb;
  }

  .game-content {
    display: grid;
    grid-template-columns: 350px 1fr 350px;
    gap: 1rem;
    padding: 1rem;
    flex: 1;
    overflow: auto;
    min-height: 0;
  }

  .sidebar {
    overflow-y: auto;
  }

  .main-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 1rem;
    overflow-y: auto;
    padding: 1rem 0;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    font-size: 1.2rem;
  }

  /* .card-actions {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  } */

  .opponent-area {
    background: white;
    border-radius: 8px;
    padding: 1rem;
  }

  .opponent-area h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #333;
  }

  .opponent-hand-count {
    font-size: 2rem;
    font-weight: bold;
    text-align: center;
    color: #666;
    padding: 2rem;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .game-footer {
    border-top: 2px solid #ddd;
    background: white;
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

  .btn-primary {
    background: #4CAF50;
    color: white;
  }

  .btn-primary:hover {
    background: #45a049;
  }

  .btn-secondary {
    background: #f0f0f0;
    color: #333;
  }

  .btn-secondary:hover {
    background: #e0e0e0;
  }

  .hand-selection {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin: 1rem 0;
  }

  .hand-card-btn {
    padding: 0.5rem 1rem;
    border: 2px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .hand-card-btn:hover {
    border-color: #667eea;
  }

  .hand-card-btn.selected {
    border-color: #667eea;
    background: #667eea;
    color: white;
  }

  /* レスポンシブ対応 */
  @media (max-width: 1200px) {
    .game-content {
      grid-template-columns: 250px 1fr 250px;
    }
  }

  @media (max-width: 900px) {
    .game-content {
      grid-template-columns: 1fr;
    }

    .sidebar.left {
      order: 2;
    }

    .main-area {
      order: 1;
    }

    .sidebar.right {
      order: 3;
    }
  }

  /* ダークモード対応 */
  @media (prefers-color-scheme: dark) {
    .game-page {
      background: #1e1e1e;
    }

    .game-header,
    .game-footer {
      background: #2a2a2a;
      border-color: #444;
    }

    .game-header h1 {
      color: #fff;
    }

    .room-info {
      color: #aaa;
    }

    .opponent-area
    /* .card-actions */
    {
      background: #2a2a2a;
    }

    .opponent-area h3 {
      color: #fff;
    }

    .opponent-hand-count {
      background: #333;
      color: #ccc;
    }

    .loading {
      color: #aaa;
    }
  }

  /* ターゲット選択UI */
  .target-hint {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    pointer-events: auto;
  }

  /* マス選択タイプ（position, fromTo）の場合は上部に固定 */
  .target-hint:has(> div:first-child:not(:has(button)):not(:has(select))) {
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    min-width: 300px;
  }

  /* ROW/COL選択や手札選択の場合は中央モーダル */
  .target-hint:has(.selection-buttons),
  .target-hint:has(.hand-selection) {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 400px;
    max-width: 90vw;
  }

  .target-hint:has(.selection-buttons)::before,
  .target-hint:has(.hand-selection)::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: -1;
  }

  .target-hint > div:first-child {
    font-size: 1.25rem;
    font-weight: bold;
    color: #ffffff;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .target-hint-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    display: flex;
    justify-content: center;
    padding-top: 1rem;
    pointer-events: none;
  }

  .selection-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  .selection-buttons > div {
    font-weight: 600;
    color: #333;
    font-size: 1rem;
  }

  .selection-buttons button {
    min-width: 120px;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 8px;
    border: 2px solid #ddd;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .selection-buttons button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .selection-buttons button.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: #667eea;
  }

  .selection-buttons button.btn-secondary {
    background: white;
    color: #667eea;
    border-color: #667eea;
  }

  .selection-buttons button.btn-secondary:hover {
    background: #f0f4ff;
  }

  .selection-buttons select {
    padding: 0.75rem;
    font-size: 1rem;
    border: 2px solid #667eea;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    min-width: 200px;
  }

  /* 手札選択UI */
  .hand-selection {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
    margin: 1rem 0;
  }

  .hand-card-btn {
    padding: 0.75rem 1.5rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .hand-card-btn:hover {
    border-color: #667eea;
    transform: translateY(-2px);
  }

  .hand-card-btn.selected {
    border-color: #667eea;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .target-hint {
      min-width: 90vw;
      padding: 1.5rem;
    }

    .selection-buttons button {
      min-width: 100px;
      padding: 0.6rem 1rem;
      font-size: 0.9rem;
    }
  }

    .rematch-section {
    text-align: center;
    padding: 2rem;
    background: white;
    border-radius: 12px;
    margin: 1rem auto;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .rematch-waiting {
    padding: 1rem;
    background: #f0f4ff;
    border-radius: 8px;
    color: #667eea;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .btn-rematch {
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: 600;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-rematch:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  .card-preview-btn {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    min-width: 150px;
  }

  .card-preview-index {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 0.25rem;
  }

  .card-preview-name {
    font-size: 1rem;
    font-weight: 600;
  }
</style>
