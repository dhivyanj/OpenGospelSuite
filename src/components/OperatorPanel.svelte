<script lang="ts">
  import { onMount } from 'svelte';
  import { presentationStore, defaultThemes, type Theme } from '../lib/presentationStore.svelte.ts';
  import { playlistStore } from '../lib/playlistStore.svelte.ts';
  import { dbClient } from '../lib/db';
  import { parseBibleShortcut } from '../lib/bibleShortcuts';
  import SlideRenderer from './SlideRenderer.svelte';

  // Core State
  let activeTab = $state<'songs' | 'bibles' | 'presentation' | 'settings'>('songs');
  let darkMode = $state(true);
  let rightTab = $state<'live' | 'details'>('live');
  
  // Embedded Panels inside Schedule
  let showCustomSlidePanel = $state(false);
  let showImportPanel = $state(false);

  // Songs Search & Subtab State
  let songSubTab = $state<'find' | 'schedule'>('find');
  let songQuery = $state('');
  let songResults = $state<any[]>([]);
  let selectedSong = $state<any | null>(null);
  let songPreviewSlides = $state<string[]>([]);
  let previewSlideIndex = $state(0);

  // Bibles State
  let bibleQuery = $state('');
  let bibleSearchResults = $state<any[]>([]);
  let books = $state<Array<{ bookName: string; bookNum: number }>>([]);
  let selectedBook = $state('');
  let chapters = $state<number[]>([]);
  let selectedChapter = $state<number | null>(null);
  let chapterVerses = $state<any[]>([]);
  let selectedVerseIndices = $state<number[]>([]);

  // Calendar State
  let calendarYear = $state(new Date().getFullYear());
  let calendarMonth = $state(new Date().getMonth());
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Import State
  let importStatus = $state('');
  let isDragging = $state(false);

  // Custom Slide State
  let customTitle = $state('');
  let customSubtitle = $state('');
  let customText = $state('');

  // Active Presentation state (derived from presentationStore)
  const presentationTitle = $derived(presentationStore.title);
  const presentationSubtitle = $derived(presentationStore.subtitle);
  const presentationSlides = $derived(presentationStore.slides);
  const activeSlideIndex = $derived(presentationStore.activeSlide);
  const currentTheme = $derived(presentationStore.theme);
  const blackout = $derived(presentationStore.blackout);
  const clearText = $derived(presentationStore.clearText);
  const alertText = $derived(presentationStore.alertText);

  let newAlertText = $state('');

  // Settings & Subtabs State
  let settingsSubTab = $state<'songs' | 'bibles' | 'appearance' | 'general'>('songs');
  let selectedSongLanguage = $state('All');
  let selectedBibleLanguage = $state('All');
  let googleFontInput = $state('');
  
  // Font Mapping State
  let fontMappingTamil = $state('Latha');
  let fontMappingDefault = $state('Outfit');
  let importedFonts = $state<string[]>(['Outfit', 'Inter', 'Roboto', 'Arial', 'Latha']);

  // DB Statistics state
  let dbStats = $state({ biblesCount: 0, songsCount: 0 });

  // Compute remote and projector links dynamically
  const remoteUrl = $derived(() => {
    const host = window.location.hostname || 'localhost';
    const port = window.location.port || '3000';
    return `http://${host}:${port}/#/remote`;
  });

  const projectorUrl = $derived(() => {
    const host = window.location.hostname || 'localhost';
    const port = window.location.port || '3000';
    return `http://${host}:${port}/#/projector`;
  });

  // Track light/dark mode changes in HTML class
  $effect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }
  });

  // Font mapping is applied explicitly via updateFontMapping() called from event handlers.
  // Song language filtering is triggered by the select onchange handler.
  // DB stats are fetched when the settings tab is first selected via onSettingsTabClick().

  function updateFontMapping() {
    if (presentationStore.theme) {
      presentationStore.setTheme({
        ...presentationStore.theme,
        fontMapping: {
          Tamil: fontMappingTamil,
          Default: fontMappingDefault
        }
      });
    }
  }

  function onSettingsTabClick() {
    activeTab = 'settings';
    fetchDbStats();
  }

  async function fetchDbStats() {
    try {
      const allSongs = await dbClient.listSongs();
      dbStats.songsCount = allSongs.length;
      dbStats.biblesCount = books.length > 0 ? 1 : 0;
    } catch (e) {
      console.warn("Failed to fetch database stats:", e);
    }
  }

  // Google fonts dynamic loading
  function loadGoogleFont(fontName: string) {
    if (!fontName) return;
    const linkId = `gfont-${fontName.toLowerCase().replace(/\s+/g, '-')}`;
    if (document.getElementById(linkId)) return;
    
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }

  function addGoogleFont() {
    const font = googleFontInput.trim();
    if (font && !importedFonts.includes(font)) {
      loadGoogleFont(font);
      importedFonts = [...importedFonts, font];
      localStorage.setItem('opengospel_imported_fonts', JSON.stringify(importedFonts));
      googleFontInput = '';
    }
  }

  // Image/Video background helpers
  function handleBgImageUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      presentationStore.setTheme({
        ...presentationStore.theme,
        bgImage: base64,
        bgVideo: undefined
      });
    };
    reader.readAsDataURL(file);
  }

  function handleBgVideoUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      presentationStore.setTheme({
        ...presentationStore.theme,
        bgVideo: base64,
        bgImage: undefined
      });
    };
    reader.readAsDataURL(file);
  }

  function clearBgMedia() {
    presentationStore.setTheme({
      ...presentationStore.theme,
      bgImage: undefined,
      bgVideo: undefined
    });
  }

  // DB Backup exports
  async function exportSongs() {
    try {
      const songs = await dbClient.listSongs();
      const json = JSON.stringify(songs, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opengospel_songs_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to export songs backup: " + e);
    }
  }

  async function exportBible() {
    try {
      const data = await dbClient.exportBible();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opengospel_bible_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to export Bible backup: " + e);
    }
  }

  const filteredBooks = $derived(() => {
    if (selectedBibleLanguage === 'Tamil') {
      return books.filter(b => /[\u0b80-\u0bff]/.test(b.bookName));
    } else if (selectedBibleLanguage === 'English') {
      return books.filter(b => !/[\u0b80-\u0bff]/.test(b.bookName));
    }
    return books;
  });

  onMount(async () => {
    try {
      await dbClient.init();
      books = await dbClient.listBooks();
      await searchSongs();
    } catch (e) {
      console.error('Failed to initialize database client:', e);
    }
  });

  // Song operations
  async function searchSongs() {
    try {
      const results = await dbClient.searchSongs(songQuery);
      if (selectedSongLanguage === 'Tamil') {
        songResults = results.filter(song => /[\u0b80-\u0bff]/.test(song.lyrics) || /[\u0b80-\u0bff]/.test(song.title));
      } else if (selectedSongLanguage === 'English') {
        songResults = results.filter(song => !(/[\u0b80-\u0bff]/.test(song.lyrics) || /[\u0b80-\u0bff]/.test(song.title)));
      } else {
        songResults = results;
      }
    } catch (err) {
      console.error('Song search failed:', err);
    }
  }

  function previewSong(song: any) {
    selectedSong = song;
    const parts = song.lyrics.split(/\n\n+/);
    songPreviewSlides = parts.map((p: string) => {
      return p.replace(/^\[[^\]]+\]\n*/g, '').trim();
    }).filter((p: string) => p.length > 0);
    previewSlideIndex = 0;
    rightTab = 'details';
  }

  function songGoLive() {
    if (!selectedSong || songPreviewSlides.length === 0) return;
    presentationStore.setPresentation(selectedSong.title, `by ${selectedSong.authors}`, songPreviewSlides);
    rightTab = 'live';
  }

  function songAddToPlaylist() {
    if (!selectedSong || songPreviewSlides.length === 0) return;
    playlistStore.addItem({
      type: 'song',
      title: selectedSong.title,
      subtitle: selectedSong.authors,
      slides: songPreviewSlides
    });
  }

  // Bible operations & Shortcut Parsing
  async function handleBibleShortcutSearch(query: string, source: 'songs' | 'bibles'): Promise<boolean> {
    const parsed = parseBibleShortcut(query, books);
    if (!parsed) return false;

    activeTab = 'bibles';
    selectedBook = parsed.bookName;
    await onBookChange();
    selectedChapter = parsed.chapter;
    await onChapterChange();
    
    bibleQuery = ''; 
    bibleSearchResults = [];

    if (parsed.verse !== undefined) {
      const verseIdx = chapterVerses.findIndex(v => v.verseNum === parsed.verse);
      if (verseIdx !== -1) {
        selectedVerseIndices = [verseIdx];
        bibleGoLiveFromChapter();
      }
    }
    
    if (source === 'songs') {
      songQuery = '';
    } else {
      bibleQuery = '';
    }
    return true;
  }

  async function handleSongSearchOrShortcut(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const handled = await handleBibleShortcutSearch(songQuery, 'songs');
      if (!handled) {
        await searchSongs();
      }
    }
  }

  async function handleBibleSearchOrShortcut(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const handled = await handleBibleShortcutSearch(bibleQuery, 'bibles');
      if (!handled) {
        await searchBible();
      }
    }
  }

  async function searchBible() {
    if (!bibleQuery.trim()) return;
    try {
      bibleSearchResults = await dbClient.searchBible(bibleQuery);
    } catch (err) {
      console.error('Bible search failed:', err);
    }
  }

  async function onBookChange() {
    selectedChapter = null;
    chapterVerses = [];
    selectedVerseIndices = [];
    if (!selectedBook) return;
    try {
      chapters = await dbClient.getChapters(selectedBook);
    } catch (err) {
      console.error('Failed to get chapters:', err);
    }
  }

  async function onChapterChange() {
    selectedVerseIndices = [];
    if (!selectedBook || selectedChapter === null) return;
    try {
      chapterVerses = await dbClient.getVerses(selectedBook, selectedChapter);
    } catch (err) {
      console.error('Failed to get verses:', err);
    }
  }

  function toggleVerseSelection(index: number) {
    const idx = selectedVerseIndices.indexOf(index);
    if (idx === -1) {
      selectedVerseIndices.push(index);
    } else {
      selectedVerseIndices.splice(idx, 1);
    }
    selectedVerseIndices.sort((a, b) => a - b);
  }

  function bibleGoLiveFromChapter() {
    if (selectedVerseIndices.length === 0) return;
    const slides = selectedVerseIndices.map(idx => {
      const v = chapterVerses[idx];
      return `${selectedBook} ${selectedChapter}:${v.verseNum}\n\n${v.text}`;
    });
    const verseRange = selectedVerseIndices.map(idx => chapterVerses[idx].verseNum);
    const startVerse = Math.min(...verseRange);
    const endVerse = Math.max(...verseRange);
    const rangeStr = startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`;
    
    presentationStore.setPresentation(
      `${selectedBook} ${selectedChapter}:${rangeStr}`,
      'Scripture Reading',
      slides
    );
    rightTab = 'live';
  }

  function bibleAddToPlaylistFromChapter() {
    if (selectedVerseIndices.length === 0) return;
    const slides = selectedVerseIndices.map(idx => {
      const v = chapterVerses[idx];
      return `${selectedBook} ${selectedChapter}:${v.verseNum}\n\n${v.text}`;
    });
    const verseRange = selectedVerseIndices.map(idx => chapterVerses[idx].verseNum);
    const startVerse = Math.min(...verseRange);
    const endVerse = Math.max(...verseRange);
    const rangeStr = startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`;
    
    playlistStore.addItem({
      type: 'scripture',
      title: `${selectedBook} ${selectedChapter}:${rangeStr}`,
      subtitle: 'Scripture Reading',
      slides
    });
  }

  function bibleGoLiveFromSearch(verse: any) {
    presentationStore.setPresentation(
      `${verse.bookName} ${verse.chapter}:${verse.verseNum}`,
      'Scripture Lookup',
      [`${verse.bookName} ${verse.chapter}:${verse.verseNum}\n\n${verse.text}`]
    );
    rightTab = 'live';
  }

  // XML imports
  async function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  }

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      await processFiles(input.files);
    }
  }

  async function processFiles(files: FileList) {
    importStatus = `Importing ${files.length} file(s)...`;
    let biblesImported = 0;
    let songsImported = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('<xmlbible') || lowerText.includes('<biblebook') || lowerText.includes('<xml_bible') || lowerText.includes('<vers')) {
        try {
          const count = await dbClient.importBible(text);
          biblesImported++;
          importStatus = `Successfully imported Bible with ${count} verses.`;
          books = await dbClient.listBooks();
        } catch (e: any) {
          importStatus = `Failed importing Bible: ${e.message}`;
        }
      } else if (lowerText.includes('<song')) {
        try {
          const title = await dbClient.importSong(text);
          songsImported++;
          importStatus = `Successfully imported song "${title}".`;
          await searchSongs();
        } catch (e: any) {
          importStatus = `Failed importing song: ${e.message}`;
        }
      } else {
        importStatus = `File "${file.name}" not recognized.`;
      }
    }
  }

  // Custom slides
  function customGoLive() {
    if (!customTitle.trim() || !customText.trim()) return;
    const slides = customText.split(/\n\n+/).map(s => s.trim()).filter(s => s.length > 0);
    presentationStore.setPresentation(customTitle, customSubtitle || 'Presentation Slide', slides);
    rightTab = 'live';
  }

  function customAddToPlaylist() {
    if (!customTitle.trim() || !customText.trim()) return;
    const slides = customText.split(/\n\n+/).map(s => s.trim()).filter(s => s.length > 0);
    playlistStore.addItem({
      type: 'slide',
      title: customTitle,
      subtitle: customSubtitle || 'Presentation Slide',
      slides
    });
    customTitle = '';
    customSubtitle = '';
    customText = '';
  }

  // Projector Launcher
  async function launchProjector() {
    const targetUrl = window.location.origin + window.location.pathname + '#/projector';
    window.open(targetUrl, 'ProjectorScreen', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,resizable=yes');
  }

  // Calendar Helpers
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  const calendarDays = $derived.by(() => {
    const days = [];
    const totalDays = getDaysInMonth(calendarYear, calendarMonth);
    const startOffset = getFirstDayOfMonth(calendarYear, calendarMonth);
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  });

  function selectCalendarDate(day: number) {
    const monthStr = String(calendarMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    playlistStore.setDate(`${calendarYear}-${monthStr}-${dayStr}`);
  }

  function prevMonth() {
    if (calendarMonth === 0) {
      calendarMonth = 11;
      calendarYear -= 1;
    } else {
      calendarMonth -= 1;
    }
  }

  function nextMonth() {
    if (calendarMonth === 11) {
      calendarMonth = 0;
      calendarYear += 1;
    } else {
      calendarMonth += 1;
    }
  }

  function isSelectedDate(day: number) {
    const monthStr = String(calendarMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return playlistStore.selectedDate === `${calendarYear}-${monthStr}-${dayStr}`;
  }

  function isToday(day: number) {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === calendarMonth && today.getFullYear() === calendarYear;
  }

  function hasScheduleItems(day: number) {
    const monthStr = String(calendarMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${calendarYear}-${monthStr}-${dayStr}`;
    return playlistStore.schedules[dateStr] && playlistStore.schedules[dateStr].length > 0;
  }
</script>

<div class="operator-console">
  <!-- Left Column: Unified simplified Control Panel -->
  <div class="control-panel">
    <div class="brand">
      <h2>OpenGospel</h2>
      <span>Operator Panel</span>
    </div>

    <div class="control-section">
      <h3>Quick Display Action</h3>
      <div class="quick-toggles">
        <button class="control-btn blackout" class:active={blackout} onclick={() => presentationStore.toggleBlackout()}>
          Blackout
        </button>
        <button class="control-btn clear-text" class:active={clearText} onclick={() => presentationStore.toggleClearText()}>
          Clear Text
        </button>
      </div>
    </div>

    <div class="control-section">
      <h3>App Configuration</h3>
      <div class="settings-grid">
        <button class="theme-mode-btn" onclick={() => darkMode = !darkMode}>
          {darkMode ? '☀️ Switch Light Mode' : '🌙 Switch Dark Mode'}
        </button>
        <button class="launch-projector-btn" onclick={launchProjector}>
          📺 Launch Projector
        </button>
      </div>
    </div>

    <div class="control-section">
      <h3>Presentation Styling</h3>
      <select 
        id="theme-select"
        value={currentTheme.name}
        onchange={(e) => {
          const match = defaultThemes.find(t => t.name === (e.target as HTMLSelectElement).value);
          if (match) presentationStore.setTheme(match);
        }}
      >
        {#each defaultThemes as t}
          <option value={t.name}>{t.name}</option>
        {/each}
      </select>
    </div>

    <div class="control-section emergency-section">
      <h3>Emergency Notification</h3>
      <div class="alert-control">
        <input 
          type="text" 
          placeholder="Type message banner here..." 
          bind:value={newAlertText} 
          onkeydown={(e) => e.key === 'Enter' && presentationStore.setAlertText(newAlertText)}
        />
        <div class="alert-buttons">
          <button onclick={() => presentationStore.setAlertText(newAlertText)} class="alert-apply-btn">Alert</button>
          <button onclick={() => { newAlertText = ''; presentationStore.setAlertText(''); }} class="alert-clear-btn">&times;</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Center Column: Libraries Search, Paginated Preview & Scheduling -->
  <div class="library-panel">
    <div class="tabs">
      <button class:active={activeTab === 'songs'} onclick={() => activeTab = 'songs'}>Songs</button>
      <button class:active={activeTab === 'bibles'} onclick={() => activeTab = 'bibles'}>Bible</button>
      <button class:active={activeTab === 'presentation'} onclick={() => activeTab = 'presentation'}>Presentation</button>
      <button class:active={activeTab === 'settings'} onclick={onSettingsTabClick}>Settings</button>
    </div>

    <div class="tab-content">
      <!-- SONGS TAB -->
      {#if activeTab === 'songs'}
        <div class="songs-container">
          <div class="subtabs">
            <button class:active={songSubTab === 'find'} onclick={() => songSubTab = 'find'}>Find Songs</button>
            <button class:active={songSubTab === 'schedule'} onclick={() => songSubTab = 'schedule'}>Service Schedule</button>
          </div>

          {#if songSubTab === 'find'}
            <!-- Find Songs Subtab -->
            <div class="search-bar">
              <input 
                type="text" 
                placeholder="Search by title, lyrics, or type Bible shortcut (e.g. ps 145 19)..." 
                bind:value={songQuery} 
                oninput={searchSongs}
                onkeydown={handleSongSearchOrShortcut}
              />
            </div>
            
            <div class="song-find-split">
              <!-- Left list of songs -->
              <div class="list-container">
                {#if songResults.length === 0}
                  <div class="no-results">No songs found.</div>
                {:else}
                  {#each songResults as song}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div 
                      class="song-result-item" 
                      class:selected={selectedSong?.id === song.id}
                      onclick={() => previewSong(song)}
                    >
                      <h5>{song.title}</h5>
                      <span>{song.authors}</span>
                    </div>
                  {/each}
                {/if}
              </div>

              <!-- Right paginated preview of selected song slides -->
              <div class="paginated-preview-container">
                {#if !selectedSong}
                  <div class="preview-placeholder">Select a song from the list to preview slides</div>
                {:else}
                  <div class="preview-header">
                    <div>
                      <h4>{selectedSong.title}</h4>
                      <span>by {selectedSong.authors}</span>
                    </div>
                    <div class="preview-actions">
                      <button class="live-btn" onclick={songGoLive}>Go Live</button>
                      <button class="add-btn" onclick={songAddToPlaylist}>+ Schedule</button>
                    </div>
                  </div>

                  <div class="paginated-box">
                    <div class="paginated-slide">
                      <pre class="big-preview-text">{songPreviewSlides[previewSlideIndex] || ''}</pre>
                    </div>
                    
                    <div class="paginated-nav">
                      <button class="nav-btn" disabled={previewSlideIndex === 0} onclick={() => previewSlideIndex--}>
                        &larr; Prev
                      </button>
                      <span class="slide-count">Slide {previewSlideIndex + 1} of {songPreviewSlides.length}</span>
                      <button class="nav-btn" disabled={previewSlideIndex >= songPreviewSlides.length - 1} onclick={() => previewSlideIndex++}>
                        Next &rarr;
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {:else}
            <!-- Service Schedule Subtab -->
            <div class="schedule-split">
              <!-- Left: Month Calendar -->
              <div class="calendar-container">
                <div class="calendar-nav">
                  <button onclick={prevMonth}>&larr;</button>
                  <h4>{monthNames[calendarMonth]} {calendarYear}</h4>
                  <button onclick={nextMonth}>&rarr;</button>
                </div>
                
                <div class="calendar-days-header">
                  {#each dayNames as day}
                    <div class="calendar-header-day">{day}</div>
                  {/each}
                </div>
                
                <div class="calendar-grid">
                  {#each calendarDays as day}
                    {#if day === null}
                      <div class="calendar-empty"></div>
                    {:else}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div 
                        class="calendar-day-btn"
                        class:selected={isSelectedDate(day)}
                        class:today={isToday(day)}
                        class:has-items={hasScheduleItems(day)}
                        onclick={() => selectCalendarDate(day)}
                      >
                        {day}
                      </div>
                    {/if}
                  {/each}
                </div>
              </div>

              <!-- Right: Selected Date Schedule Items List -->
              <div class="schedule-list-container">
                <div class="schedule-header">
                  <h4>Schedule for {playlistStore.selectedDate}</h4>
                  <button class="clear-btn" onclick={() => playlistStore.clearPlaylist()}>Clear</button>
                </div>

                <div class="schedule-items">
                  {#if playlistStore.items.length === 0}
                    <div class="empty-schedule">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>
                      <p>No items scheduled for this date. Search songs or scriptures and add them here!</p>
                    </div>
                  {:else}
                    {#each playlistStore.items as item, index}
                      <div class="schedule-item-card" class:active={index === playlistStore.activeItemIndex}>
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div class="item-info" onclick={() => playlistStore.selectItem(index)}>
                          <span class="item-type-badge {item.type}">{item.type}</span>
                          <h5>{item.title}</h5>
                          <span>{item.subtitle}</span>
                        </div>
                        <div class="item-actions">
                          <button class="move-btn" onclick={() => playlistStore.moveItem(index, -1)} disabled={index === 0}>▲</button>
                          <button class="move-btn" onclick={() => playlistStore.moveItem(index, 1)} disabled={index === playlistStore.items.length - 1}>▼</button>
                          <button class="delete-btn" onclick={() => playlistStore.removeItem(index)} title="Remove">&times;</button>
                        </div>
                      </div>
                    {/each}
                  {/if}
                </div>

                <div class="schedule-embedded-controls">
                  <!-- Collapsible Add Custom Slide Section -->
                  <div class="collapsible-section">
                    <button 
                      class="section-toggle-btn" 
                      onclick={() => showCustomSlidePanel = !showCustomSlidePanel}
                    >
                      {showCustomSlidePanel ? '▼ Hide Custom Slide Form' : '▶ Create Custom Slide'}
                    </button>
                    {#if showCustomSlidePanel}
                      <div class="embedded-form-card">
                        <div class="form-group-embedded">
                          <input type="text" placeholder="Title (e.g. Announcements)" bind:value={customTitle} />
                          <input type="text" placeholder="Subtitle / Sub-header" bind:value={customSubtitle} />
                        </div>
                        <div class="form-group-embedded">
                          <textarea 
                            placeholder="Slide text... Double newline separates slides." 
                            bind:value={customText}
                            rows="3"
                          ></textarea>
                        </div>
                        <div class="embedded-form-actions">
                          <button class="live-btn mini-btn" onclick={customGoLive} disabled={!customTitle || !customText}>Go Live</button>
                          <button class="add-btn mini-btn" onclick={customAddToPlaylist} disabled={!customTitle || !customText}>+ Schedule</button>
                        </div>
                      </div>
                    {/if}
                  </div>

                  <!-- Collapsible Import XML Section -->
                  <div class="collapsible-section">
                    <button 
                      class="section-toggle-btn" 
                      onclick={() => showImportPanel = !showImportPanel}
                    >
                      {showImportPanel ? '▼ Hide Import Area' : '▶ Import XML Bibles / Songs'}
                    </button>
                    {#if showImportPanel}
                      <div class="embedded-form-card">
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div 
                          class="drop-zone mini-drop-zone"
                          class:dragover={isDragging}
                          ondragover={(e) => { e.preventDefault(); isDragging = true; }}
                          ondragleave={() => isDragging = false}
                          ondrop={handleFileDrop}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                          <p>Drag files here or click to browse</p>
                          <input type="file" multiple accept=".xml" onchange={handleFileSelect} />
                        </div>
                        {#if importStatus}
                          <div class="import-status-mini">{importStatus}</div>
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- BIBLES TAB -->
      {#if activeTab === 'bibles'}
        <div class="bibles-container">
          <div class="search-bar">
            <input 
              type="text" 
              placeholder="Search scriptures or enter code word (e.g. ps 145 19 or mt 23)..." 
              bind:value={bibleQuery} 
              onkeydown={handleBibleSearchOrShortcut}
            />
            <button onclick={searchBible} class="primary-btn">Search</button>
          </div>

          <div class="browse-bar">
            <div class="field">
              <label for="book-select">Book:</label>
              <select id="book-select" bind:value={selectedBook} onchange={onBookChange}>
                <option value="">-- Select Book --</option>
                {#each filteredBooks() as book}
                  <option value={book.bookName}>{book.bookName}</option>
                {/each}
              </select>
            </div>
            
            <div class="field">
              <label for="chapter-select">Chapter:</label>
              <select id="chapter-select" bind:value={selectedChapter} onchange={onChapterChange} disabled={!selectedBook}>
                <option value={null}>--</option>
                {#each chapters as chap}
                  <option value={chap}>{chap}</option>
                {/each}
              </select>
            </div>

            {#if selectedVerseIndices.length > 0}
              <div class="browse-actions">
                <button class="live-btn" onclick={bibleGoLiveFromChapter}>Go Live</button>
                <button class="add-btn" onclick={bibleAddToPlaylistFromChapter}>+ Schedule</button>
              </div>
            {/if}
          </div>

          <div class="bible-content-panel">
            {#if bibleQuery && bibleSearchResults.length > 0}
              <div class="full-results">
                <h4>Search Results for "{bibleQuery}"</h4>
                <div class="search-results-list">
                  {#each bibleSearchResults as verse}
                    <div class="bible-search-item">
                      <div class="search-item-header">
                        <h5>{verse.bookName} {verse.chapter}:{verse.verseNum}</h5>
                        <div class="item-actions">
                          <button class="live-btn" onclick={() => bibleGoLiveFromSearch(verse)}>Go Live</button>
                          <button class="add-btn" onclick={() => playlistStore.addItem({type: 'scripture', title: `${verse.bookName} ${verse.chapter}:${verse.verseNum}`, subtitle: 'Scripture Lookup', slides: [`${verse.bookName} ${verse.chapter}:${verse.verseNum}\n\n${verse.text}`]})}>+ Schedule</button>
                        </div>
                      </div>
                      <p class="verse-text">{verse.text}</p>
                    </div>
                  {/each}
                </div>
              </div>
            {:else if selectedBook && selectedChapter !== null}
              <div class="full-results">
                <h4>{selectedBook} Chapter {selectedChapter}</h4>
                <div class="verses-grid">
                  {#each chapterVerses as verse, idx}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div 
                      class="verse-browse-card"
                      class:selected={selectedVerseIndices.includes(idx)}
                      onclick={() => toggleVerseSelection(idx)}
                    >
                      <span class="verse-num">{verse.verseNum}</span>
                      <p class="verse-text">{verse.text}</p>
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="bible-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
                <p>Browse scriptures by selecting a Book and Chapter above, or use the keyword search bar.</p>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- PRESENTATION TAB -->
      {#if activeTab === 'presentation'}
        <div class="presentation-config-container">
          <h4>Presentation Settings</h4>
          
          <div class="config-grid">
            <!-- Background Asset -->
            <div class="config-card">
              <h5>Background Asset</h5>
              <div class="media-preview-box">
                {#if currentTheme.bgVideo}
                  <div class="media-badge video">Video Active</div>
                  <span class="file-info-text">Background Video Loaded</span>
                {:else if currentTheme.bgImage}
                  <img src={currentTheme.bgImage} alt="Background Preview" class="img-preview" />
                  <span class="file-info-text">Background Image Loaded</span>
                {:else}
                  <div class="no-media-text">No Custom Background Media</div>
                {/if}
              </div>
              <div class="media-upload-actions">
                <label class="file-upload-btn">
                  <span>📷 Image</span>
                  <input type="file" accept="image/*" onchange={handleBgImageUpload} />
                </label>
                <label class="file-upload-btn">
                  <span>🎥 Video</span>
                  <input type="file" accept="video/*" onchange={handleBgVideoUpload} />
                </label>
                <button class="clear-btn-red" onclick={clearBgMedia} disabled={!currentTheme.bgImage && !currentTheme.bgVideo}>Clear</button>
              </div>
            </div>

            <!-- Transition selector -->
            <div class="config-card">
              <h5>Slide Transitions</h5>
              <div class="form-group-horizontal">
                <label for="transition-select">Text Animation:</label>
                <select 
                  id="transition-select" 
                  value={currentTheme.transition} 
                  onchange={(e) => {
                    presentationStore.setTheme({
                      ...currentTheme,
                      transition: (e.target as HTMLSelectElement).value as any
                    });
                  }}
                >
                  <option value="none">None (Instant)</option>
                  <option value="fade">Fade In / Out</option>
                  <option value="slide">Slide In / Out</option>
                  <option value="zoom">Zoom Scale</option>
                </select>
              </div>
            </div>

            <!-- OBS / Lower Third Layout -->
            <div class="config-card">
              <h5>OBS / Broadcast Layout</h5>
              <div class="form-group-horizontal">
                <label for="layout-select">Display Mode:</label>
                <select 
                  id="layout-select" 
                  value={currentTheme.layout || 'fullscreen'} 
                  onchange={(e) => {
                    presentationStore.setTheme({
                      ...currentTheme,
                      layout: (e.target as HTMLSelectElement).value as any
                    });
                  }}
                >
                  <option value="fullscreen">Full Screen Presentation</option>
                  <option value="lowerthird">Transparent Lower Third (OBS overlay)</option>
                </select>
              </div>
              
              {#if currentTheme.layout === 'lowerthird'}
                <div class="obs-info-box">
                  <p>Copy this URL for your OBS Browser Source:</p>
                  <div class="copy-url-row">
                    <input type="text" readonly value={projectorUrl()} />
                    <button class="mini-copy-btn" onclick={() => {
                      navigator.clipboard.writeText(projectorUrl());
                      alert("Projector link copied to clipboard!");
                    }}>Copy</button>
                  </div>
                </div>
              {/if}
            </div>

            <!-- Language display fonts mapping -->
            <div class="config-card">
              <h5>Display Font Mappings</h5>
              <div class="form-group-horizontal">
                <label for="tamil-font-input">Tamil Font:</label>
                <select id="tamil-font-input" bind:value={fontMappingTamil} onchange={updateFontMapping}>
                  {#each importedFonts as font}
                    <option value={font}>{font}</option>
                  {/each}
                </select>
              </div>
              <div class="form-group-horizontal">
                <label for="default-font-input">Default Font:</label>
                <select id="default-font-input" bind:value={fontMappingDefault} onchange={updateFontMapping}>
                  {#each importedFonts as font}
                    <option value={font}>{font}</option>
                  {/each}
                </select>
              </div>
            </div>

            <!-- Remote usage & QR Code -->
            <div class="config-card full-width">
              <h5>Remote Control Interface</h5>
              <div class="remote-control-split">
                <div class="remote-info">
                  <p>Scan the QR code or open the link on any local network device to control slides remotely:</p>
                  <a href={remoteUrl()} target="_blank" class="remote-link">{remoteUrl()}</a>
                </div>
                <div class="qr-code-box">
                  <img 
                    src="https://api.qrserver.com/v1/create-qr-code/?size=130x130&data={encodeURIComponent(remoteUrl())}" 
                    alt="Remote Access QR Code" 
                    class="qr-code-img"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- SETTINGS TAB -->
      {#if activeTab === 'settings'}
        <div class="settings-container">
          <div class="settings-subtabs">
            <button class:active={settingsSubTab === 'songs'} onclick={() => settingsSubTab = 'songs'}>Songs</button>
            <button class:active={settingsSubTab === 'bibles'} onclick={() => settingsSubTab = 'bibles'}>Bibles</button>
            <button class:active={settingsSubTab === 'appearance'} onclick={() => settingsSubTab = 'appearance'}>Appearance</button>
            <button class:active={settingsSubTab === 'general'} onclick={() => settingsSubTab = 'general'}>General</button>
          </div>

          <div class="settings-subtab-content">
            <!-- Songs Settings -->
            {#if settingsSubTab === 'songs'}
              <div class="settings-card">
                <h5>Song Filters</h5>
                <div class="form-group-horizontal">
                  <label for="song-lang-select">Filter by Language:</label>
                  <select id="song-lang-select" bind:value={selectedSongLanguage} onchange={() => searchSongs()}>
                    <option value="All">All Songs</option>
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                  </select>
                </div>
              </div>
            {/if}

            <!-- Bibles Settings -->
            {#if settingsSubTab === 'bibles'}
              <div class="settings-card">
                <h5>Bible Filters</h5>
                <div class="form-group-horizontal">
                  <label for="bible-lang-select">Filter Books by Language:</label>
                  <select id="bible-lang-select" bind:value={selectedBibleLanguage}>
                    <option value="All">All Books</option>
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                  </select>
                </div>
              </div>
            {/if}

            <!-- Appearance Settings -->
            {#if settingsSubTab === 'appearance'}
              <div class="settings-card">
                <h5>Application UI Aesthetics</h5>
                <div class="form-group-horizontal">
                  <label for="theme-dark-toggle">Theme Mode:</label>
                  <button id="theme-dark-toggle" class="toggle-switch-btn" onclick={() => darkMode = !darkMode}>
                    {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                  </button>
                </div>
              </div>

              <div class="settings-card">
                <h5>Import Google Web Fonts</h5>
                <p class="settings-help">Type the exact Google Font name to load it dynamically into the presentation system.</p>
                <div class="font-search-row">
                  <input type="text" placeholder="e.g. DM Sans, Playfair Display, Inter" bind:value={googleFontInput} />
                  <button class="primary-btn" onclick={addGoogleFont}>Import Font</button>
                </div>
                <div class="loaded-fonts-list">
                  <h6>Available Display Fonts:</h6>
                  <div class="chips-container">
                    {#each importedFonts as font}
                      <span class="font-chip">{font}</span>
                    {/each}
                  </div>
                </div>
              </div>
            {/if}

            <!-- General Settings -->
            {#if settingsSubTab === 'general'}
              <div class="settings-card">
                <h5>Database Statistics</h5>
                <div class="db-stats-grid">
                  <div class="stat-item">
                    <span class="stat-val">{dbStats.songsCount}</span>
                    <span class="stat-lbl">Songs Loaded</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-val">{dbStats.biblesCount}</span>
                    <span class="stat-lbl">Bibles Loaded</span>
                  </div>
                </div>
              </div>

              <div class="settings-card">
                <h5>Backup and Data Exports</h5>
                <p class="settings-help">Export your database files as portable JSON configuration backups.</p>
                <div class="backup-actions">
                  <button class="export-btn" onclick={exportSongs} disabled={dbStats.songsCount === 0}>
                    📥 Export Songs List
                  </button>
                  <button class="export-btn" onclick={exportBible} disabled={dbStats.biblesCount === 0}>
                    📥 Export Bible Verses
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Right Column: Active Output Canvas & Presentation Detail Controls -->
  <div class="presentation-panel">
    <div class="right-panel-tabs">
      <button class:active={rightTab === 'live'} onclick={() => rightTab = 'live'}>Live Output</button>
      {#if selectedSong}
        <button class:active={rightTab === 'details'} onclick={() => rightTab = 'details'}>Song Details</button>
      {/if}
    </div>

    <div class="right-tab-content">
      {#if rightTab === 'live'}
        <!-- Active Slide Output & Navigation -->
        <div class="live-panel-container">
          <div class="preview-canvas-wrapper">
            <SlideRenderer 
              text={presentationSlides[activeSlideIndex] || ''} 
              theme={currentTheme} 
              blackout={blackout} 
              clearText={clearText} 
              alertText={alertText} 
              isPreview={true} 
            />
          </div>

          <div class="slides-controller">
            <div class="active-presentation-info">
              <h4>{presentationTitle}</h4>
              <span>{presentationSubtitle}</span>
            </div>

            <div class="slides-list">
              {#each presentationSlides as slideText, index}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                  class="slide-tile"
                  class:active={index === activeSlideIndex}
                  onclick={() => presentationStore.setActiveSlide(index)}
                >
                  <span class="slide-index">{index + 1}</span>
                  <pre class="slide-preview-text">{slideText}</pre>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {:else if selectedSong}
        <!-- Selected Song Full Details Panel -->
        <div class="song-details-panel">
          <div class="details-header">
            <h3>{selectedSong.title}</h3>
            <span>by {selectedSong.authors}</span>
          </div>
          
          <div class="details-actions">
            <button class="live-btn large-btn" onclick={songGoLive}>Send Live Now</button>
            <button class="add-btn large-btn" onclick={songAddToPlaylist}>Add to Schedule</button>
          </div>

          <div class="full-lyrics-container">
            <h4>Lyrics Preview</h4>
            <pre class="details-lyrics">{selectedSong.lyrics}</pre>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* Layout Grid with Variables */
  .operator-console {
    display: flex;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: 'Inter', sans-serif;
    transition: var(--theme-transition);
  }

  /* Left Control Sidebar */
  .control-panel {
    width: 250px;
    min-width: 230px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    padding: 1.25rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .brand h2 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--accent-color);
    letter-spacing: -0.02em;
  }

  .brand span {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .control-section {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .control-section h3 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .quick-toggles {
    display: flex;
    gap: 0.5rem;
  }

  .control-btn {
    flex: 1;
    min-height: 44px;
    border: 1px solid var(--border-color);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .control-btn:hover {
    border-color: var(--border-hover);
  }

  .control-btn.blackout.active {
    background: var(--live-color);
    color: #ffffff;
    border-color: var(--live-color);
  }

  .control-btn.clear-text.active {
    background: #f59e0b;
    color: #ffffff;
    border-color: #f59e0b;
  }

  .settings-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .theme-mode-btn, .launch-projector-btn {
    width: 100%;
    min-height: 44px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    text-align: left;
    padding: 0 0.85rem;
    box-sizing: border-box;
    transition: all 0.2s;
  }

  .theme-mode-btn:hover, .launch-projector-btn:hover {
    background: var(--accent-bg);
    border-color: var(--accent-color);
    color: var(--accent-color);
  }

  select {
    width: 100%;
    min-height: 44px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 6px;
    padding: 0 0.75rem;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .alert-control {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .alert-control input {
    width: 100%;
    min-height: 44px;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0 0.75rem;
    color: var(--text-primary);
    box-sizing: border-box;
    font-size: 0.9rem;
  }

  .alert-buttons {
    display: flex;
    gap: 0.4rem;
  }

  .alert-apply-btn {
    flex: 1;
    min-height: 40px;
    background: var(--live-color);
    border: none;
    color: #ffffff;
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .alert-apply-btn:hover {
    background: var(--live-hover);
  }

  .alert-clear-btn {
    width: 40px;
    min-height: 40px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-size: 1.2rem;
    border-radius: 6px;
    cursor: pointer;
  }

  /* Center Library panel */
  .library-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    border-right: 1px solid var(--border-color);
  }

  .tabs {
    display: flex;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  .tabs button {
    flex: 1;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    padding: 1.1rem 1rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tabs button:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.02);
  }

  .tabs button.active {
    color: var(--accent-color);
    border-bottom-color: var(--accent-color);
    background: var(--accent-bg);
  }

  .tab-content {
    flex: 1;
    overflow: hidden;
  }

  /* Songs subtabs container */
  .songs-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .subtabs {
    display: flex;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
    padding: 0.25rem 0.5rem;
    gap: 0.25rem;
  }

  .subtabs button {
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--text-secondary);
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .subtabs button.active {
    background: var(--bg-secondary);
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
  }

  .search-bar {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    gap: 0.5rem;
  }

  .search-bar input {
    flex: 1;
    min-height: 44px;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0 0.85rem;
    color: var(--text-primary);
    font-size: 0.95rem;
    box-sizing: border-box;
  }

  .search-bar input:focus {
    border-color: var(--accent-color);
    outline: none;
  }

  .song-find-split {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .list-container {
    width: 38%;
    border-right: 1px solid var(--border-color);
    overflow-y: auto;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .song-result-item {
    padding: 0.75rem 0.9rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.01);
  }

  .song-result-item:hover {
    background: rgba(0, 0, 0, 0.04);
    border-color: var(--border-color);
  }

  .song-result-item.selected {
    background: var(--accent-bg);
    border-color: var(--accent-color);
  }

  .song-result-item h5 {
    margin: 0 0 0.15rem 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .song-result-item span {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  /* Paginated Preview Styling */
  .paginated-preview-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .preview-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    font-size: 0.95rem;
    padding: 2rem;
    text-align: center;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
  }

  .preview-header h4 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .preview-header span {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .preview-actions {
    display: flex;
    gap: 0.5rem;
  }

  .live-btn {
    background: var(--live-color);
    border: none;
    color: #ffffff;
    padding: 0.6rem 1.1rem;
    font-size: 0.85rem;
    font-weight: 700;
    border-radius: 6px;
    cursor: pointer;
    min-height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .live-btn:hover {
    background: var(--live-hover);
  }

  .add-btn {
    background: var(--add-color);
    border: none;
    color: #ffffff;
    padding: 0.6rem 1.1rem;
    font-size: 0.85rem;
    font-weight: 700;
    border-radius: 6px;
    cursor: pointer;
    min-height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .add-btn:hover {
    background: var(--add-hover);
  }

  .large-btn {
    min-height: 46px;
    padding: 0.75rem 1.5rem;
    font-size: 0.95rem;
  }

  .paginated-box {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1.25rem;
    gap: 1rem;
    overflow: hidden;
  }

  .paginated-slide {
    flex: 1;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    overflow: auto;
  }

  .big-preview-text {
    margin: 0;
    font-family: 'Inter', sans-serif;
    font-size: 1.25rem;
    line-height: 1.6;
    color: var(--text-primary);
    text-align: center;
    white-space: pre-wrap;
  }

  .paginated-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    border-radius: 6px;
  }

  .nav-btn {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    min-height: 38px;
    font-weight: 600;
  }

  .nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .slide-count {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  /* Schedule Subtab Split */
  .schedule-split {
    flex: 1;
    display: flex;
    overflow: hidden;
    height: calc(100% - 45px); /* Subtract subtabs header */
  }

  .calendar-container {
    width: 45%;
    border-right: 1px solid var(--border-color);
    padding: 1rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .calendar-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .calendar-nav h4 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
  }

  .calendar-nav button {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
  }

  .calendar-days-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 0.25rem;
  }

  .calendar-header-day {
    text-align: center;
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .calendar-empty {
    aspect-ratio: 1;
  }

  .calendar-day-btn {
    aspect-ratio: 1;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .calendar-day-btn:hover {
    border-color: var(--accent-color);
    background: var(--accent-bg);
  }

  .calendar-day-btn.selected {
    background: var(--accent-color);
    color: #ffffff;
    border-color: var(--accent-color);
  }

  .calendar-day-btn.today {
    box-shadow: inset 0 0 0 2px var(--accent-color);
  }

  .calendar-day-btn.has-items::after {
    content: '';
    position: absolute;
    bottom: 5px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--add-color);
  }

  .calendar-day-btn.selected.has-items::after {
    background: #ffffff;
  }

  .schedule-list-container {
    flex: 1;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .schedule-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.85rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
  }

  .schedule-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }

  .clear-btn {
    background: transparent;
    border: 1px solid var(--live-color);
    color: var(--live-color);
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .clear-btn:hover {
    background: var(--live-color);
    color: #ffffff;
  }

  .schedule-items {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .empty-schedule {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    text-align: center;
    padding: 2rem;
  }

  .empty-schedule p {
    margin-top: 0.5rem;
    font-size: 0.85rem;
  }

  .schedule-item-card {
    display: flex;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.65rem 0.85rem;
    align-items: center;
    justify-content: space-between;
    transition: all 0.2s;
  }

  .schedule-item-card:hover {
    border-color: var(--border-hover);
  }

  .schedule-item-card.active {
    border-color: var(--accent-color);
    background: var(--accent-bg);
  }

  .item-info {
    flex: 1;
    cursor: pointer;
  }

  .item-type-badge {
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    display: inline-block;
    margin-bottom: 0.25rem;
  }

  .item-type-badge.song { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
  .item-type-badge.scripture { background: rgba(16, 185, 129, 0.15); color: #34d399; }
  .item-type-badge.slide { background: rgba(167, 139, 250, 0.15); color: #c084fc; }

  .schedule-item-card h5 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .schedule-item-card span {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .item-actions {
    display: flex;
    gap: 0.2rem;
  }

  .move-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    width: 28px;
    height: 28px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.7rem;
  }

  .move-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .delete-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 1.25rem;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-btn:hover {
    color: var(--live-color);
  }

  /* Bibles Tab */
  .bibles-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .browse-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    align-items: center;
  }

  .browse-bar .field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .browse-bar label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .browse-bar select {
    min-height: 38px;
    padding: 0 0.5rem;
  }

  .browse-actions {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
  }

  .bible-content-panel {
    flex: 1;
    overflow-y: auto;
  }

  .bible-search-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 0.75rem;
  }

  .search-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .search-item-header h5 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }

  .verse-text {
    margin: 0;
    font-size: 1.1rem; /* Enlarged verse text for better readability */
    line-height: 1.5;
    color: var(--text-primary);
  }

  .verses-grid {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .verse-browse-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    padding: 0.85rem 1.25rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
  }

  .verse-browse-card:hover {
    border-color: var(--border-hover);
  }

  .verse-browse-card.selected {
    background: rgba(16, 185, 129, 0.1);
    border-color: #10b981;
  }

  .verse-browse-card .verse-num {
    font-size: 0.95rem;
    color: #10b981;
    font-weight: 800;
    min-width: 20px;
    text-align: right;
    margin-top: 0.1rem;
  }

  .verse-browse-card .verse-text {
    flex: 1;
    margin: 0;
  }

  .full-results {
    padding: 1.25rem;
  }

  .bible-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: var(--text-muted);
    text-align: center;
  }

  .bible-placeholder p {
    margin-top: 0.75rem;
    font-size: 0.95rem;
  }

  /* Drop Zone (used by embedded schedule import) */
  .drop-zone {
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    padding: 3rem 1.5rem;
    text-align: center;
    position: relative;
    cursor: pointer;
    transition: all 0.2s;
  }

  .drop-zone:hover {
    border-color: var(--accent-color);
    background: var(--accent-bg);
  }

  .drop-zone input[type="file"] {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  /* Right column presentation panel */
  .presentation-panel {
    width: 320px;
    min-width: 300px;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .right-panel-tabs {
    display: flex;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
  }

  .right-panel-tabs button {
    flex: 1;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    padding: 0.85rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .right-panel-tabs button.active {
    color: var(--accent-color);
    border-bottom-color: var(--accent-color);
  }

  .right-tab-content {
    flex: 1;
    overflow: hidden;
  }

  .live-panel-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.75rem;
    box-sizing: border-box;
    gap: 0.75rem;
  }

  .preview-canvas-wrapper {
    aspect-ratio: 16/9;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--border-color);
    background: #000;
  }

  .slides-controller {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.5rem;
  }

  .active-presentation-info {
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .active-presentation-info h4 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .active-presentation-info span {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .slides-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .slide-tile {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 4px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    cursor: pointer;
  }

  .slide-tile.active {
    border-color: var(--accent-color);
    background: var(--accent-bg);
  }

  .slide-index {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    background: var(--bg-tertiary);
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .slide-tile.active .slide-index {
    background: var(--accent-color);
    color: #ffffff;
  }

  .slide-preview-text {
    margin: 0;
    font-family: inherit;
    font-size: 0.8rem;
    line-height: 1.35;
    color: var(--text-primary);
    white-space: pre-wrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* Song Details Tab styling */
  .song-details-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1rem;
    box-sizing: border-box;
    gap: 1rem;
  }

  .details-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
  }

  .details-header span {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .details-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .full-lyrics-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .full-lyrics-container h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    text-transform: uppercase;
  }

  .details-lyrics {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    padding: 1rem;
    border-radius: 6px;
    margin: 0;
    font-family: inherit;
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--text-primary);
    white-space: pre-wrap;
  }

  /* Adaptive layouts (Responsiveness) */
  @media (max-width: 1024px) {
    .operator-console {
      flex-direction: column;
      overflow-y: auto;
    }

    .control-panel {
      width: 100%;
      min-width: 100%;
      border-right: none;
      border-bottom: 1px solid var(--border-color);
      flex-direction: row;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      padding: 0.75rem 1rem;
    }

    .brand {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .control-section {
      flex: 1;
      min-width: 200px;
    }

    .emergency-section {
      width: 100%;
      flex: none;
    }

    .library-panel {
      border-right: none;
      border-bottom: 1px solid var(--border-color);
      height: 600px;
    }

    .presentation-panel {
      width: 100%;
      border-left: none;
      height: auto;
    }
  }

  @media (max-width: 640px) {
    .song-find-split, .schedule-split {
      flex-direction: column;
      overflow-y: auto;
    }

    .list-container, .calendar-container {
      width: 100%;
      border-right: none;
      border-bottom: 1px solid var(--border-color);
      height: 300px;
    }

    .paginated-preview-container, .schedule-list-container {
      height: 350px;
    }

    .browse-bar {
      flex-direction: column;
      align-items: stretch;
    }

    .browse-actions {
      margin-left: 0;
      margin-top: 0.5rem;
    }
  }

  /* Embedded Controls under Schedule */
  .schedule-embedded-controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--bg-tertiary);
    border-top: 1px solid var(--border-color);
  }

  .collapsible-section {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    overflow: hidden;
  }

  .section-toggle-btn {
    background: var(--bg-secondary);
    border: none;
    color: var(--text-primary);
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s;
  }

  .section-toggle-btn:hover {
    background: var(--border-color);
  }

  .embedded-form-card {
    padding: 0.75rem;
    background: var(--bg-primary);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group-embedded {
    display: flex;
    gap: 0.5rem;
  }

  .form-group-embedded input,
  .form-group-embedded textarea {
    flex: 1;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 0.4rem 0.6rem;
    color: var(--text-primary);
    font-size: 0.85rem;
    box-sizing: border-box;
  }

  .form-group-embedded textarea {
    resize: none;
    font-family: inherit;
  }

  .embedded-form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .mini-btn {
    padding: 0.35rem 0.75rem !important;
    font-size: 0.75rem !important;
    min-height: auto !important;
  }

  .mini-drop-zone {
    padding: 1rem 0.5rem !important;
  }

  .mini-drop-zone p {
    font-size: 0.75rem !important;
    margin: 0.25rem 0 0 0 !important;
  }

  .import-status-mini {
    font-size: 0.75rem;
    color: var(--accent-color);
    margin-top: 0.25rem;
    text-align: center;
  }

  /* Presentation Config Styles */
  .presentation-config-container {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    overflow-y: auto;
    height: 100%;
    box-sizing: border-box;
  }

  .presentation-config-container h4 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
  }

  .config-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .config-grid {
      grid-template-columns: 1fr;
    }
  }

  .config-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .config-card.full-width {
    grid-column: 1 / -1;
  }

  .config-card h5 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--accent-color);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
  }

  .media-preview-box {
    height: 100px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: #09090b;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }

  .media-preview-box img.img-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .no-media-text {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .file-info-text {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-size: 0.7rem;
    text-align: center;
    padding: 2px 0;
  }

  .media-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .media-badge.video {
    background: #e11d48;
    color: #fff;
  }

  .media-upload-actions {
    display: flex;
    gap: 0.5rem;
  }

  .file-upload-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.4rem;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    text-align: center;
    transition: background 0.2s;
  }

  .file-upload-btn:hover {
    background: var(--border-color);
  }

  .file-upload-btn input[type="file"] {
    display: none;
  }

  .clear-btn-red {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #ef4444;
    border-radius: 6px;
    padding: 0.4rem 0.75rem;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .clear-btn-red:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .form-group-horizontal {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .form-group-horizontal label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .form-group-horizontal select {
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    font-size: 0.85rem;
    min-width: 150px;
  }

  .obs-info-box {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 6px;
    font-size: 0.75rem;
  }

  .obs-info-box p {
    margin: 0 0 0.4rem 0;
    font-weight: 600;
    color: var(--accent-color);
  }

  .copy-url-row {
    display: flex;
    gap: 0.5rem;
  }

  .copy-url-row input {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    color: var(--text-secondary);
    font-size: 0.7rem;
  }

  .mini-copy-btn {
    background: var(--accent-color);
    border: none;
    color: #fff;
    border-radius: 4px;
    padding: 0.25rem 0.75rem;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .remote-control-split {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .remote-info {
    flex: 1;
  }

  .remote-info p {
    margin: 0 0 0.5rem 0;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .remote-link {
    color: var(--accent-color);
    font-size: 0.9rem;
    font-weight: 700;
    word-break: break-all;
  }

  .qr-code-box {
    background: #fff;
    padding: 0.5rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .qr-code-img {
    display: block;
    width: 130px;
    height: 130px;
  }

  /* Settings Subtab layout */
  .settings-container {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    overflow-y: auto;
    height: 100%;
    box-sizing: border-box;
  }

  .settings-subtabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
  }

  .settings-subtabs button {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 0.4rem 1rem;
    cursor: pointer;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    transition: background 0.2s, color 0.2s;
  }

  .settings-subtabs button.active {
    background: var(--accent-bg);
    color: var(--accent-color);
  }

  .settings-subtab-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .settings-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .settings-card h5 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--accent-color);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
  }

  .settings-help {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 0;
  }

  .toggle-switch-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 0.4rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.85rem;
    transition: background 0.2s;
  }

  .toggle-switch-btn:hover {
    background: var(--border-color);
  }

  .font-search-row {
    display: flex;
    gap: 0.5rem;
  }

  .font-search-row input {
    flex: 1;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.4rem 0.75rem;
    color: var(--text-primary);
    font-size: 0.85rem;
  }

  .loaded-fonts-list {
    margin-top: 0.5rem;
  }

  .loaded-fonts-list h6 {
    margin: 0 0 0.5rem 0;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .chips-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .font-chip {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    color: var(--text-primary);
    font-weight: 500;
  }

  .db-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    text-align: center;
  }

  .stat-item {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    padding: 0.75rem;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
  }

  .stat-val {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--accent-color);
  }

  .stat-lbl {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .backup-actions {
    display: flex;
    gap: 0.75rem;
  }

  .export-btn {
    flex: 1;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 6px;
    padding: 0.6rem;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    transition: background 0.2s, border-color 0.2s;
  }

  .export-btn:hover:not(:disabled) {
    background: var(--accent-bg);
    border-color: var(--accent-color);
  }

  .export-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
