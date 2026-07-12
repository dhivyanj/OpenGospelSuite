<script lang="ts">
  import { onMount } from 'svelte';

  // Remote State Runes
  let status = $state('connecting');
  let title = $state('No Presentation');
  let subtitle = $state('');
  let slides = $state<string[]>([]);
  let activeSlide = $state(0);
  let blackout = $state(false);
  let clearText = $state(false);
  
  let socket: WebSocket | null = null;

  onMount(() => {
    connectWS();
    return () => {
      socket?.close();
    };
  });

  function connectWS() {
    status = 'connecting';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    
    try {
      socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          status = 'connected';
          // Request immediate sync
          socket.send(JSON.stringify({ type: 'get_state' }));
        }
      };
      
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'sync_state') {
          title = data.state.title;
          subtitle = data.state.subtitle;
          slides = data.state.slides;
          activeSlide = data.state.activeSlide;
          blackout = data.state.blackout;
          clearText = data.state.clearText;
        }
      };
      
      socket.onclose = () => {
        status = 'disconnected';
        // Retry connection in 3 seconds
        setTimeout(connectWS, 3000);
      };

      socket.onerror = () => {
        status = 'error';
      };
    } catch (e) {
      status = 'error';
    }
  }

  function sendAction(action: string, payload?: any) {
    if (socket && status === 'connected' && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'action', action, ...payload }));
    }
  }

  function next() {
    sendAction('next');
  }

  function prev() {
    sendAction('prev');
  }

  function toggleBlackout() {
    sendAction('blackout');
  }

  function toggleClearText() {
    sendAction('clearText');
  }

  function selectSlide(index: number) {
    sendAction('setSlide', { index });
  }
</script>

<div class="mobile-remote" class:blackout-active={blackout}>
  <!-- Status Header -->
  <div class="header">
    <div class="status-indicator">
      <span class="dot" class:connected={status === 'connected'} class:connecting={status === 'connecting'} class:disconnected={status === 'disconnected'}></span>
      <span class="status-text">{status.toUpperCase()}</span>
    </div>
    <span class="brand">OpenGospel Remote</span>
  </div>

  {#if status === 'connecting'}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Connecting to OpenGospelSuite server...</p>
    </div>
  {:else if status === 'disconnected'}
    <div class="error-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      <p>Connection Lost</p>
      <span>Attempting to reconnect... Make sure your mobile device is on the same local Wi-Fi network.</span>
    </div>
  {:else}
    <!-- Active Slide Text Preview -->
    <div class="slide-preview-panel" class:clear-active={clearText}>
      {#if blackout}
        <div class="blackout-cover">BLACKOUT ACTIVE</div>
      {:else if clearText}
        <div class="clear-cover">TEXT CLEARED (Background visible)</div>
      {/if}
      <div class="metadata">
        <h4>{title}</h4>
        <span>{subtitle}</span>
      </div>
      <div class="current-text">
        {#if slides[activeSlide]}
          <p>{slides[activeSlide]}</p>
        {:else}
          <p class="empty">[Empty Slide]</p>
        {/if}
      </div>
    </div>

    <!-- Navigation Big Touch Buttons -->
    <div class="touch-controls">
      <button class="nav-btn prev-btn" onclick={prev} disabled={activeSlide === 0}>
        <span class="arrow">&larr;</span>
        <span class="label">PREV</span>
      </button>
      <button class="nav-btn next-btn" onclick={next} disabled={activeSlide === slides.length - 1}>
        <span class="label">NEXT</span>
        <span class="arrow">&rarr;</span>
      </button>
    </div>

    <!-- Toggle Controls -->
    <div class="utility-controls">
      <button class="control-btn blackout-toggle" class:active={blackout} onclick={toggleBlackout}>
        Blackout
      </button>
      <button class="control-btn clear-toggle" class:active={clearText} onclick={toggleClearText}>
        Clear Text
      </button>
    </div>

    <!-- Slides Quick Jump List -->
    <div class="slides-list-section">
      <h3>Slides Navigation</h3>
      <div class="slides-scroll">
        {#each slides as slideText, index}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div 
            class="slide-row" 
            class:active={index === activeSlide}
            onclick={() => selectSlide(index)}
          >
            <span class="index">{index + 1}</span>
            <span class="snippet">{slideText.substring(0, 80)}{slideText.length > 80 ? '...' : ''}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .mobile-remote {
    width: 100vw;
    height: 100vh;
    background: #0f1115;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 1.25rem;
    background: #181c24;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #9ca3af;
  }

  .dot.connected {
    background: #10b981;
    box-shadow: 0 0 8px #10b981;
  }

  .dot.connecting {
    background: #f59e0b;
    animation: pulse 1s infinite alternate;
  }

  .dot.disconnected {
    background: #ef4444;
  }

  .status-text {
    font-size: 0.7rem;
    font-weight: 700;
    color: #9ca3af;
  }

  .brand {
    font-size: 0.85rem;
    font-weight: 700;
    color: #a78bfa;
  }

  .loading-state, .error-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
  }

  .loading-state p {
    margin-top: 1rem;
    color: #94a3b8;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(139, 92, 246, 0.2);
    border-top-color: #8b5cf6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .error-state svg {
    color: #ef4444;
    margin-bottom: 1rem;
  }

  .error-state p {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
  }

  .error-state span {
    font-size: 0.8rem;
    color: #64748b;
    line-height: 1.4;
  }

  /* Slide Preview Panel */
  .slide-preview-panel {
    background: #1f2937;
    margin: 1rem;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 140px;
    max-height: 200px;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .slide-preview-panel.clear-active {
    opacity: 0.6;
  }

  .blackout-cover, .clear-cover {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1rem;
    z-index: 10;
  }

  .blackout-cover {
    background: #000000;
    color: #ef4444;
  }

  .clear-cover {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
    backdrop-filter: blur(2px);
  }

  .metadata h4 {
    margin: 0 0 0.15rem 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: #ffffff;
  }

  .metadata span {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .current-text {
    flex: 1;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .current-text p {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    text-align: center;
    line-height: 1.4;
    color: #f3f4f6;
  }

  .current-text p.empty {
    color: #4b5563;
    font-style: italic;
  }

  /* Big Touch Controls */
  .touch-controls {
    display: flex;
    gap: 1rem;
    padding: 0 1rem;
    height: 120px;
  }

  .nav-btn {
    flex: 1;
    border: none;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    transition: transform 0.1s, opacity 0.2s;
  }

  .nav-btn:active {
    transform: scale(0.96);
  }

  .prev-btn {
    background: #374151;
    color: #ffffff;
  }

  .next-btn {
    background: #8b5cf6;
    color: #ffffff;
  }

  .nav-btn:disabled {
    opacity: 0.35;
    pointer-events: none;
  }

  .nav-btn .arrow {
    font-size: 2.2rem;
    font-weight: 700;
  }

  .nav-btn .label {
    font-size: 0.85rem;
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  /* Utility controls */
  .utility-controls {
    display: flex;
    gap: 1rem;
    padding: 1rem;
  }

  .control-btn {
    flex: 1;
    background: #1f2937;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #cbd5e1;
    padding: 0.75rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .control-btn.blackout-toggle.active {
    background: #ef4444;
    border-color: #ef4444;
    color: #ffffff;
  }

  .control-btn.clear-toggle.active {
    background: #f59e0b;
    border-color: #f59e0b;
    color: #ffffff;
  }

  /* Slide list jump section */
  .slides-list-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0 1rem 1rem 1rem;
    overflow: hidden;
  }

  .slides-list-section h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .slides-scroll {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    padding: 0.5rem;
  }

  .slide-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.75rem;
    border-radius: 6px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid transparent;
  }

  .slide-row.active {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.35);
  }

  .slide-row .index {
    font-size: 0.75rem;
    font-weight: 800;
    color: #8b5cf6;
  }

  .slide-row .snippet {
    font-size: 0.8rem;
    color: #cbd5e1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .slide-row.active .snippet {
    color: #ffffff;
    font-weight: 600;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0% { opacity: 0.6; }
    100% { opacity: 1; }
  }
</style>
