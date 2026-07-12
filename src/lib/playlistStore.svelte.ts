import { presentationStore } from './presentationStore.svelte.ts';

export interface PlaylistItem {
  id: string;
  type: 'song' | 'scripture' | 'slide';
  title: string;
  subtitle: string;
  slides: string[];
}

class ScheduleStore {
  // Mapping of "YYYY-MM-DD" -> PlaylistItem[]
  schedules = $state<Record<string, PlaylistItem[]>>({});
  
  // Currently selected date string (defaulting to today)
  selectedDate = $state<string>(new Date().toISOString().split('T')[0]);
  
  activeItemIndex = $state<number>(0);

  constructor() {
    this.loadFromStorage();
    // Pre-populate today with a welcome slide if completely empty
    if (Object.keys(this.schedules).length === 0) {
      this.schedules[this.selectedDate] = [
        {
          id: 'welcome',
          type: 'slide',
          title: 'Welcome Screen',
          subtitle: 'Opening Slide',
          slides: [
            'Welcome to Church\nOpenGospelSuite',
            'Presentation starts shortly.\nPlease silence your mobile devices.'
          ]
        }
      ];
      this.saveToStorage();
    }
  }

  // Get items for the currently selected date
  get items() {
    return this.schedules[this.selectedDate] || [];
  }

  set items(newItems: PlaylistItem[]) {
    this.schedules[this.selectedDate] = newItems;
    this.saveToStorage();
  }

  // Load schedules from localStorage
  private loadFromStorage() {
    try {
      const data = localStorage.getItem('opengospel_schedules');
      if (data) {
        this.schedules = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load schedules:', e);
    }
  }

  // Save schedules to localStorage
  private saveToStorage() {
    try {
      localStorage.setItem('opengospel_schedules', JSON.stringify(this.schedules));
    } catch (e) {
      console.error('Failed to save schedules:', e);
    }
  }

  setDate(dateStr: string) {
    this.selectedDate = dateStr;
    this.activeItemIndex = 0;
  }

  addItem(item: Omit<PlaylistItem, 'id'>) {
    const newItem: PlaylistItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9)
    };
    
    if (!this.schedules[this.selectedDate]) {
      this.schedules[this.selectedDate] = [];
    }
    
    this.schedules[this.selectedDate].push(newItem);
    this.saveToStorage();
    
    // If it's the first item, load it automatically
    if (this.items.length === 1) {
      this.selectItem(0);
    }
  }

  removeItem(index: number) {
    const currentItems = this.items;
    if (index < 0 || index >= currentItems.length) return;
    
    currentItems.splice(index, 1);
    this.schedules[this.selectedDate] = currentItems;
    this.saveToStorage();
    
    // Adjust active index
    if (this.activeItemIndex >= currentItems.length) {
      this.activeItemIndex = Math.max(0, currentItems.length - 1);
    }
    
    if (currentItems.length > 0) {
      this.selectItem(this.activeItemIndex);
    } else {
      // Clear presentation
      presentationStore.setPresentation('OpenGospelSuite', 'No item loaded', ['']);
    }
  }

  moveItem(index: number, direction: -1 | 1) {
    const currentItems = this.items;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentItems.length) return;
    
    // Swap items
    const temp = currentItems[index];
    currentItems[index] = currentItems[newIndex];
    currentItems[newIndex] = temp;
    
    this.schedules[this.selectedDate] = currentItems;
    this.saveToStorage();
    
    // Keep active item selected
    if (this.activeItemIndex === index) {
      this.activeItemIndex = newIndex;
    } else if (this.activeItemIndex === newIndex) {
      this.activeItemIndex = index;
    }
  }

  selectItem(index: number) {
    const currentItems = this.items;
    if (index < 0 || index >= currentItems.length) return;
    this.activeItemIndex = index;
    const item = currentItems[index];
    presentationStore.setPresentation(item.title, item.subtitle, item.slides);
  }
  
  clearPlaylist() {
    this.schedules[this.selectedDate] = [];
    this.activeItemIndex = 0;
    this.saveToStorage();
    presentationStore.setPresentation('OpenGospelSuite', 'No item loaded', ['']);
  }
}

export const playlistStore = new ScheduleStore();
