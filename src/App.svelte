<script lang="ts">
  import { onMount } from 'svelte';
  import { presentationStore } from './lib/presentationStore.svelte.ts';
  import OperatorPanel from './components/OperatorPanel.svelte';
  import ProjectorView from './components/ProjectorView.svelte';
  import RemoteControl from './components/RemoteControl.svelte';

  // Routing State Rune
  let currentHash = $state(window.location.hash);

  // Operator WebSocket connection
  let socket: WebSocket | null = null;
  let socketConnected = $state(false);

  onMount(() => {
    // Listen to hash routing changes
    const handleHashChange = () => {
      currentHash = window.location.hash;
    };
    window.addEventListener('hashchange', handleHashChange);

    // If operator console, open a WebSocket connection to receive remote commands
    if (currentHash === '' || currentHash === '#/' || currentHash === '#') {
      connectOperatorSocket();
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      socket?.close();
    };
  });

  // Re-run connection when hash changes back to operator console
  $effect(() => {
    if (currentHash === '' || currentHash === '#/' || currentHash === '#') {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        connectOperatorSocket();
      }
    } else {
      socket?.close();
      socket = null;
      socketConnected = false;
    }
  });

  function connectOperatorSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    
    try {
      socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socketConnected = true;
          // Let the server know this is the operator client
          socket.send(JSON.stringify({ type: 'register_operator' }));
          sendStateToSocket();
        }
      };
      
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'action') {
          const action = data.action;
          if (action === 'next') {
            presentationStore.nextSlide();
          } else if (action === 'prev') {
            presentationStore.prevSlide();
          } else if (action === 'blackout') {
            presentationStore.toggleBlackout();
          } else if (action === 'clearText') {
            presentationStore.toggleClearText();
          } else if (action === 'setSlide') {
            presentationStore.setActiveSlide(data.index);
          }
        } else if (data.type === 'get_state') {
          sendStateToSocket();
        }
      };
      
      socket.onclose = () => {
        socketConnected = false;
        // Try reconnecting after 3 seconds
        setTimeout(() => {
          if (currentHash === '' || currentHash === '#/' || currentHash === '#') {
            connectOperatorSocket();
          }
        }, 3000);
      };

      socket.onerror = () => {
        socketConnected = false;
      };
    } catch (e) {
      console.warn('Failed to open operator WebSocket connection:', e);
    }
  }

  function sendStateToSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'sync_state',
        state: presentationStore.getRawState()
      }));
    }
  }

  // Monitor Svelte state changes and push to WebSocket
  $effect(() => {
    // Destructure properties to trigger reaction
    const _slides = presentationStore.slides;
    const _active = presentationStore.activeSlide;
    const _blackout = presentationStore.blackout;
    const _clearText = presentationStore.clearText;
    const _title = presentationStore.title;
    const _sub = presentationStore.subtitle;
    
    if (socketConnected) {
      sendStateToSocket();
    }
  });
</script>

<main class="app-main">
  {#if currentHash === '#/projector'}
    <ProjectorView />
  {:else if currentHash === '#/remote'}
    <RemoteControl />
  {:else}
    <OperatorPanel />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: #0c0a0f;
    color: #f1f5f9;
  }

  .app-main {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }
</style>
