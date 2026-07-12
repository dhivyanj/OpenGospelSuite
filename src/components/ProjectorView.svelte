<script lang="ts">
  import { onMount } from 'svelte';
  import { presentationStore } from '../lib/presentationStore.svelte.ts';
  import SlideRenderer from './SlideRenderer.svelte';

  // Svelte 5 reactive bindings from presentationStore
  const currentSlideText = $derived(presentationStore.slides[presentationStore.activeSlide] || '');
  const currentTheme = $derived(presentationStore.theme);
  const blackout = $derived(presentationStore.blackout);
  const clearText = $derived(presentationStore.clearText);
  const alertText = $derived(presentationStore.alertText);

  onMount(() => {
    // Request initial state synchronization from operator console upon loading
    presentationStore.requestSync();
    
    // Auto-request sync every 3 seconds if slides are empty (ensure sync on reload)
    const interval = setInterval(() => {
      if (presentationStore.slides.length <= 1 && presentationStore.slides[0] === 'Welcome to OpenGospelSuite') {
        presentationStore.requestSync();
      }
    }, 3000);
    
    return () => clearInterval(interval);
  });
</script>

<div class="projector-view">
  <SlideRenderer 
    text={currentSlideText} 
    theme={currentTheme} 
    blackout={blackout} 
    clearText={clearText} 
    alertText={alertText} 
  />
</div>

<style>
  .projector-view {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    margin: 0;
    padding: 0;
    background: #000000;
  }
</style>
