<script lang="ts">
  import { goto } from '$app/navigation';

  let roomId = $state('');
  let createRoomName = $state('');

  // ランダムなルームIDを生成
  function generateRoomId(): string {
    return `room_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ルームに参加
  function joinRoom() {
    if (!roomId.trim()) {
      alert('ルームIDを入力してください');
      return;
    }
    goto(`/game/${roomId.trim()}`);
  }

  // ルームを作成
  function createRoom() {
    const newRoomId = createRoomName.trim() || generateRoomId();
    goto(`/game/${newRoomId}`);
  }

  // クイックスタート（ランダムルーム）
  function quickStart() {
    goto('/quickstart');
  }
</script>

<svelte:head>
  <title>Card Tic-Tac-Toe - カード効果で戦う○×ゲーム</title>
  <meta name="description" content="29種類のカード効果を駆使して戦略的に勝利を目指す、オンライン対戦型○×ゲーム。盤面操作、妨害、防御、補助カードで相手と駆け引き！" />
</svelte:head>

<div class="container">
  <header class="header">
    <h1>🎮 Card Tic-Tac-Toe</h1>
    <p class="subtitle">カード効果で戦う○×ゲーム</p>
  </header>

  <main class="main">
    <div class="card">
      <h2>ゲームを始める</h2>
      
      <!-- クイックスタート -->
      <div class="section">
        <button onclick={quickStart} class="btn btn-large btn-primary">
          🎮 クイックスタート
        </button>
        <p class="help-text">ランダムなルームを作成してすぐに始める</p>
      </div>

      <div class="divider">または</div>

      <!-- ルームを作成 -->
      <div class="section">
        <h3>ルームを作成</h3>
        <div class="input-group">
          <input
            type="text"
            bind:value={createRoomName}
            placeholder="ルーム名（省略可）"
            class="input"
          />
          <button onclick={createRoom} class="btn btn-primary">
            作成
          </button>
        </div>
      </div>

      <div class="divider">または</div>

      <!-- ルームに参加 -->
      <div class="section">
        <h3>ルームに参加</h3>
        <div class="input-group">
          <input
            type="text"
            bind:value={roomId}
            placeholder="ルームID/ルーム名を入力"
            class="input"
            onkeydown={(e) => e.key === 'Enter' && joinRoom()}
          />
          <button onclick={joinRoom} class="btn btn-secondary">
            参加
          </button>
        </div>
      </div>
    </div>

    <!-- ゲーム説明 -->
    <div class="info-card">
      <h2>ゲームについて</h2>
      <div class="info-content">
        <div class="info-section">
          <h3>基本ルール</h3>
          <ul>
            <li>3×3の盤面で先に3つ並べた方が勝利</li>
            <li>盤面は最大8×8まで拡張可能</li>
            <li>ターン制で交互にプレイ</li>
          </ul>
        </div>

        <div class="info-section">
          <h3>カード要素</h3>
          <ul>
            <li>デッキは20枚で構成</li>
            <li>初期手札は3枚</li>
            <li>毎ターン1枚ドロー（先攻1ターン目除く）</li>
            <li>毎ターン1枚カードを使用可能</li>
            <li>デッキ内に同じカードは2枚まで、妨害カードのみ1種類につき1枚まで</li>
          </ul>
        </div>

        <div class="info-section">
          <h3>カード種類</h3>
          <ul>
            <li><span class="category blue">盤面操作</span> - 盤面を変更</li>
            <li><span class="category red">妨害</span> - 相手を妨害</li>
            <li><span class="category green">防御</span> - 自分を守る</li>
            <li><span class="category orange">補助</span> - カードドローなど</li>
          </ul>
        </div>
      </div>
    </div>
  </main>

  <footer class="footer">
    <p>Created with SvelteKit & TypeScript</p>
  </footer>
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .header {
    text-align: center;
    padding: 3rem 1rem 2rem;
    color: white;
  }

  .title {
    font-size: 3rem;
    margin: 0;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .subtitle {
    font-size: 1.2rem;
    margin: 0.5rem 0 0;
    opacity: 0.9;
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }

  .card,
  .info-card {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }

  .card h2,
  .info-card h2 {
    margin: 0 0 1.5rem;
    color: #333;
    font-size: 1.5rem;
  }

  .section {
    margin-bottom: 1.5rem;
  }

  .section h3 {
    margin: 0 0 0.75rem;
    color: #555;
    font-size: 1.1rem;
  }

  .input-group {
    display: flex;
    gap: 0.5rem;
  }

  .input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  .input:focus {
    outline: none;
    border-color: #667eea;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .btn-large {
    width: 100%;
    padding: 1rem 2rem;
    font-size: 1.2rem;
  }

  .btn-primary {
    background: #667eea;
    color: white;
  }

  .btn-primary:hover {
    background: #5568d3;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .btn-secondary {
    background: #f0f0f0;
    color: #333;
  }

  .btn-secondary:hover {
    background: #e0e0e0;
  }

  .help-text {
    margin: 0.5rem 0 0;
    font-size: 0.85rem;
    color: #666;
    text-align: center;
  }

  .divider {
    text-align: center;
    color: #999;
    margin: 1rem 0;
    position: relative;
  }

  .divider::before,
  .divider::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 40%;
    height: 1px;
    background: #ddd;
  }

  .divider::before {
    left: 0;
  }

  .divider::after {
    right: 0;
  }

  .info-content {
    display: grid;
    gap: 1.5rem;
  }

  .info-section h3 {
    margin: 0 0 0.5rem;
    color: #667eea;
    font-size: 1rem;
  }

  .info-section ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .info-section li {
    margin: 0.5rem 0;
    color: #555;
    line-height: 1.6;
  }

  .category {
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.85rem;
    color: white;
  }

  .category.blue {
    background: #2196F3;
  }

  .category.red {
    background: #f44336;
  }

  .category.green {
    background: #4CAF50;
  }

  .category.orange {
    background: #FF9800;
  }

  .footer {
    text-align: center;
    padding: 2rem;
    color: white;
    opacity: 0.8;
  }

  .footer p {
    margin: 0;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .title {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1rem;
    }

    .main {
      padding: 1rem;
    }

    .card,
    .info-card {
      padding: 1.5rem;
    }

    .input-group {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }

  /* ダークモード対応 */
  @media (prefers-color-scheme: dark) {
    .card,
    .info-card {
      background: #2a2a2a;
    }

    .card h2,
    .info-card h2 {
      color: #fff;
    }

    .section h3,
    .info-section h3 {
      color: #8b9cff;
    }

    .info-section li {
      color: #ccc;
    }

    .input {
      background: #333;
      border-color: #555;
      color: #fff;
    }

    .help-text {
      color: #aaa;
    }

    .divider {
      color: #666;
    }

    .divider::before,
    .divider::after {
      background: #555;
    }
  }
</style>
