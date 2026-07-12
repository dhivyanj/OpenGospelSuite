<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, fade, scale } from 'svelte/transition';
  import type { Theme } from '../lib/presentationStore.svelte.ts';

  interface Props {
    text: string;
    theme: Theme;
    blackout: boolean;
    clearText: boolean;
    alertText: string;
    isPreview?: boolean; // If true, scales sizing and disables full-screen controls
  }

  let { 
    text = '', 
    theme, 
    blackout = false, 
    clearText = false, 
    alertText = '',
    isPreview = false 
  }: Props = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let textEl = $state<HTMLDivElement | null>(null);
  let fontSize = $state(6); // Font size in vmin

  // Detect script language of the text to apply font mappings
  function detectLanguage(t: string): string {
    if (/[\u0b80-\u0bff]/.test(t)) return 'Tamil';
    return 'Default';
  }

  const detectedLang = $derived(detectLanguage(text));
  const activeFontFamily = $derived(
    theme.fontMapping?.[detectedLang] || theme.fontFamily
  );

  // Auto-fit text sizing
  $effect(() => {
    // Run whenever the text or theme changes
    const _t = text;
    const maxFont = theme.fontSizeMax;
    fontSize = maxFont;

    // Small delay to let DOM render at max font size, then measure and scale down
    setTimeout(() => {
      if (!containerEl || !textEl) return;
      
      let currentSize = maxFont;
      const containerWidth = containerEl.clientWidth;
      const containerHeight = containerEl.clientHeight;
      const paddingSafety = isPreview ? 8 : 40; // Safety margin based on preview or full view

      for (let i = 0; i < 25; i++) {
        const textWidth = textEl.scrollWidth;
        const textHeight = textEl.scrollHeight;

        const overflows = 
          textWidth > (containerWidth - paddingSafety * 2) || 
          textHeight > (containerHeight - paddingSafety * 2);

        if (overflows && currentSize > 1.5) {
          currentSize -= 0.25;
          fontSize = currentSize;
          textEl.style.fontSize = isPreview ? `${currentSize * 0.4}rem` : `${currentSize}vmin`;
        } else {
          break;
        }
      }
    }, 20);
  });

  // Convert lines to paragraph arrays
  const processedLines = $derived(
    text.split('\n').map(line => line.trim())
  );

  // Transition parameters based on theme
  const transitionProps = $derived(() => {
    const transitionType = theme.transition;
    if (transitionType === 'slide') {
      return {
        in: { x: isPreview ? 100 : 400, duration: 300 },
        out: { x: isPreview ? -100 : -400, duration: 200 }
      };
    } else if (transitionType === 'zoom') {
      return {
        in: { scale: 0.9, opacity: 0, duration: 250 },
        out: { scale: 1.05, opacity: 0, duration: 150 }
      };
    } else {
      // default: fade
      return {
        in: { opacity: 0, duration: 250 },
        out: { opacity: 0, duration: 150 }
      };
    }
  });
</script>

<div
  bind:this={containerEl}
  class="slide-container"
  class:lower-third-layout={theme.layout === 'lowerthird'}
  style:background={blackout ? '#000000' : (theme.layout === 'lowerthird' ? 'transparent' : theme.bgGradient)}
  style:font-family={activeFontFamily}
  class:preview={isPreview}
>
  <!-- Background is black when blackout is active -->
  {#if !blackout}
    <!-- Background Video / Image (disabled in lowerthird layout) -->
    {#if theme.layout !== 'lowerthird'}
      {#if theme.bgVideo}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video class="bg-media" src={theme.bgVideo} autoplay loop muted></video>
      {/if}
      {#if theme.bgImage && !theme.bgVideo}
        <div class="bg-media bg-image" style="background-image: url({theme.bgImage})"></div>
      {/if}
    {/if}

    <!-- Slide Text Layer -->
    <div 
      class="text-wrapper"
      class:lower-third-wrapper={theme.layout === 'lowerthird'}
      style:justify-content={
        theme.layout === 'lowerthird' ? 'flex-end' :
        theme.verticalAlignment === 'top' ? 'flex-start' : 
        theme.verticalAlignment === 'bottom' ? 'flex-end' : 'center'
      }
      style:align-items={
        theme.layout === 'lowerthird' ? 'center' :
        theme.alignment === 'left' ? 'flex-start' : 
        theme.alignment === 'right' ? 'flex-end' : 'center'
      }
      style:text-align={theme.layout === 'lowerthird' ? 'center' : theme.alignment}
    >
      {#if !clearText && text}
        {#key text}
          {#if theme.layout === 'lowerthird'}
            <!-- Lower Third overlay container -->
            <div class="lower-third-backdrop">
              {#if theme.transition === 'slide'}
                <div
                  bind:this={textEl}
                  class="slide-text"
                  style:color={theme.textColor}
                  style:font-size={isPreview ? `${fontSize * 0.35}rem` : `${fontSize * 0.9}vmin`}
                  in:fly|global={transitionProps().in}
                  out:fly|global={transitionProps().out}
                >
                  {#each processedLines as line}
                    <p class="slide-line">{line}</p>
                  {/each}
                </div>
              {:else if theme.transition === 'zoom'}
                <div
                  bind:this={textEl}
                  class="slide-text"
                  style:color={theme.textColor}
                  style:font-size={isPreview ? `${fontSize * 0.35}rem` : `${fontSize * 0.9}vmin`}
                  in:scale|global={transitionProps().in}
                  out:scale|global={transitionProps().out}
                >
                  {#each processedLines as line}
                    <p class="slide-line">{line}</p>
                  {/each}
                </div>
              {:else if theme.transition === 'none'}
                <div
                  bind:this={textEl}
                  class="slide-text"
                  style:color={theme.textColor}
                  style:font-size={isPreview ? `${fontSize * 0.35}rem` : `${fontSize * 0.9}vmin`}
                >
                  {#each processedLines as line}
                    <p class="slide-line">{line}</p>
                  {/each}
                </div>
              {:else}
                <div
                  bind:this={textEl}
                  class="slide-text"
                  style:color={theme.textColor}
                  style:font-size={isPreview ? `${fontSize * 0.35}rem` : `${fontSize * 0.9}vmin`}
                  in:fade|global={transitionProps().in}
                  out:fade|global={transitionProps().out}
                >
                  {#each processedLines as line}
                    <p class="slide-line">{line}</p>
                  {/each}
                </div>
              {/if}
            </div>
          {:else}
            <!-- Standard presentation container -->
            {#if theme.transition === 'slide'}
              <div
                bind:this={textEl}
                class="slide-text"
                style:color={theme.textColor}
                style:font-size={isPreview ? `${fontSize * 0.4}rem` : `${fontSize}vmin`}
                in:fly|global={transitionProps().in}
                out:fly|global={transitionProps().out}
              >
                {#each processedLines as line}
                  <p class="slide-line">{line}</p>
                {/each}
              </div>
            {:else if theme.transition === 'zoom'}
              <div
                bind:this={textEl}
                class="slide-text"
                style:color={theme.textColor}
                style:font-size={isPreview ? `${fontSize * 0.4}rem` : `${fontSize}vmin`}
                in:scale|global={transitionProps().in}
                out:scale|global={transitionProps().out}
              >
                {#each processedLines as line}
                  <p class="slide-line">{line}</p>
                {/each}
              </div>
            {:else if theme.transition === 'none'}
              <div
                bind:this={textEl}
                class="slide-text"
                style:color={theme.textColor}
                style:font-size={isPreview ? `${fontSize * 0.4}rem` : `${fontSize}vmin`}
              >
                {#each processedLines as line}
                  <p class="slide-line">{line}</p>
                {/each}
              </div>
            {:else}
              <div
                bind:this={textEl}
                class="slide-text"
                style:color={theme.textColor}
                style:font-size={isPreview ? `${fontSize * 0.4}rem` : `${fontSize}vmin`}
                in:fade|global={transitionProps().in}
                out:fade|global={transitionProps().out}
              >
                {#each processedLines as line}
                  <p class="slide-line">{line}</p>
                {/each}
              </div>
            {/if}
          {/if}
        {/key}
      {/if}
    </div>

    <!-- Alert Banner (scrolling ticker) -->
    {#if alertText}
      <div class="alert-banner" class:preview-alert={isPreview}>
        <div class="alert-ticker">
          <span>{alertText} &nbsp;&bull;&nbsp; {alertText} &nbsp;&bull;&nbsp; {alertText} &nbsp;&bull;&nbsp; {alertText}</span>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .slide-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    transition: background 0.4s ease, color 0.4s ease;
    user-select: none;
    box-sizing: border-box;
  }

  .slide-container.preview {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    aspect-ratio: 16 / 9;
  }

  .slide-container.lower-third-layout {
    background: transparent !important;
  }

  .bg-media {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
    pointer-events: none;
  }

  .bg-image {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  .text-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 6%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    overflow: hidden;
    z-index: 10;
  }

  .text-wrapper.lower-third-wrapper {
    justify-content: flex-end !important;
    align-items: center !important;
    padding-bottom: 5vh !important;
  }

  .lower-third-backdrop {
    background: rgba(15, 23, 42, 0.85); /* Slick dark slate overlay */
    border-radius: 8px;
    padding: 1.25rem 2.5rem;
    border-left: 5px solid #10b981;
    max-width: 85%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    display: inline-block;
  }

  .slide-text {
    width: 100%;
    max-width: 100%;
    white-space: pre-line;
    word-wrap: break-word;
    font-weight: 700;
    line-height: 1.35;
    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.4);
    box-sizing: border-box;
    backface-visibility: hidden;
  }

  .slide-line {
    margin: 0;
    padding: 0.15em 0;
  }

  /* Alert scrolling ticker styles */
  .alert-banner {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background: rgba(220, 38, 38, 0.95); /* Bright Red Alert */
    color: #ffffff;
    font-weight: 800;
    font-size: 2.2vmin;
    padding: 1.2vh 0;
    box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.3);
    z-index: 100;
    overflow: hidden;
    white-space: nowrap;
    border-top: 2px solid rgba(255, 255, 255, 0.3);
  }

  .alert-banner.preview-alert {
    font-size: 0.6rem;
    padding: 3px 0;
  }

  .alert-ticker {
    display: inline-block;
    padding-left: 100%;
    animation: ticker-animation 15s linear infinite;
  }

  .alert-ticker span {
    display: inline-block;
    padding-right: 2rem;
  }

  @keyframes ticker-animation {
    0% {
      transform: translate3d(0, 0, 0);
    }
    100% {
      transform: translate3d(-100%, 0, 0);
    }
  }
</style>
