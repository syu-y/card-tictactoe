<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { websocketStore } from '$lib/stores/websocketStore';
  import { gameStore } from '$lib/stores/gameStore';

  let playerId = '';
  let playerName = '';

  onMount(() => {
    playerId = `player_${Math.random().toString(36).substr(2, 9)}`;
    playerName = `Player ${playerId.substring(7)}`;

    websocketStore.connect();

    setTimeout(() => {
      gameStore.quickStart(playerId, playerName);
    }, 500);

        // マッチング成功を監視
    const unsubscribe = gameStore.subscribe(state => {
      if (state.matchedRoomId) {
        goto(`/game/${state.matchedRoomId}`);
      }
    });

    return () => {
      unsubscribe();
    };
  });
</script>

<div class="container">
  <h1>🎲 マッチング中...</h1>
  <p>対戦相手を探しています</p>
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
</style>
