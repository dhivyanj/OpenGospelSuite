export interface Theme {
  name: string;
  bgGradient: string;
  textColor: string;
  fontFamily: string;
  alignment: 'center' | 'left' | 'right';
  verticalAlignment: 'center' | 'top' | 'bottom';
  transition: 'fade' | 'slide' | 'zoom' | 'crossfade';
  fontSizeMax: number; // in vmin
}

export interface PresentationState {
  title: string;
  subtitle: string;
  slides: string[];
  activeSlide: number;
  theme: Theme;
  blackout: boolean;
  clearText: boolean;
  alertText: string;
}

export const defaultThemes: Theme[] = [
  {
    name: 'Blue Midnight',
    bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
    textColor: '#ffffff',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    alignment: 'center',
    verticalAlignment: 'center',
    transition: 'fade',
    fontSizeMax: 8
  },
  {
    name: 'Crimson Grace',
    bgGradient: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)',
    textColor: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
    alignment: 'center',
    verticalAlignment: 'center',
    transition: 'slide',
    fontSizeMax: 7.5
  },
  {
    name: 'Forest Sanctuary',
    bgGradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #065f46 100%)',
    textColor: '#f0fdf4',
    fontFamily: "'Outfit', sans-serif",
    alignment: 'center',
    verticalAlignment: 'center',
    transition: 'zoom',
    fontSizeMax: 7.5
  },
  {
    name: 'Charcoal Minimal',
    bgGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
    textColor: '#f4f4f5',
    fontFamily: "'Inter', sans-serif",
    alignment: 'center',
    verticalAlignment: 'center',
    transition: 'fade',
    fontSizeMax: 8
  },
  {
    name: 'Neon Horizon',
    bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #030712 100%)',
    textColor: '#ffffff',
    fontFamily: "'Outfit', sans-serif",
    alignment: 'center',
    verticalAlignment: 'center',
    transition: 'crossfade',
    fontSizeMax: 8
  }
];

class PresentationStore {
  // Svelte 5 reactive states
  title = $state('Welcome to OpenGospelSuite');
  subtitle = $state('Ready to Present');
  slides = $state<string[]>([
    'OpenGospelSuite\nPortable Church Presentation Software',
    'Select a song or scripture from the menu,\nor import files in the Zefania XML or OpenLyrics formats.'
  ]);
  activeSlide = $state(0);
  theme = $state<Theme>(defaultThemes[0]);
  blackout = $state(false);
  clearText = $state(false);
  alertText = $state('');

  private channel: BroadcastChannel;
  private isBroadcasting = true;

  constructor() {
    this.channel = new BroadcastChannel('opengospel_presentation');
    
    // Listen for state synchronization messages
    this.channel.onmessage = (event) => {
      const { type, state } = event.data;
      if (type === 'sync_state') {
        this.isBroadcasting = false;
        this.title = state.title;
        this.subtitle = state.subtitle;
        this.slides = state.slides;
        this.activeSlide = state.activeSlide;
        this.theme = state.theme;
        this.blackout = state.blackout;
        this.clearText = state.clearText;
        this.alertText = state.alertText;
        this.isBroadcasting = true;
      } else if (type === 'request_sync') {
        this.broadcast();
      }
    };
  }

  getRawState(): PresentationState {
    return {
      title: this.title,
      subtitle: this.subtitle,
      slides: $state.snapshot(this.slides),
      activeSlide: this.activeSlide,
      theme: $state.snapshot(this.theme),
      blackout: this.blackout,
      clearText: this.clearText,
      alertText: this.alertText
    };
  }

  broadcast() {
    if (!this.isBroadcasting) return;
    this.channel.postMessage({
      type: 'sync_state',
      state: this.getRawState()
    });
  }

  requestSync() {
    this.channel.postMessage({ type: 'request_sync' });
  }

  setPresentation(title: string, subtitle: string, slides: string[]) {
    this.title = title;
    this.subtitle = subtitle;
    this.slides = slides.length > 0 ? slides : ['[Blank Slide]'];
    this.activeSlide = 0;
    this.broadcast();
  }

  setActiveSlide(index: number) {
    if (index >= 0 && index < this.slides.length) {
      this.activeSlide = index;
      this.broadcast();
    }
  }

  nextSlide() {
    if (this.activeSlide < this.slides.length - 1) {
      this.activeSlide++;
      this.broadcast();
    }
  }

  prevSlide() {
    if (this.activeSlide > 0) {
      this.activeSlide--;
      this.broadcast();
    }
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    this.broadcast();
  }

  setBlackout(val: boolean) {
    this.blackout = val;
    this.broadcast();
  }

  toggleBlackout() {
    this.blackout = !this.blackout;
    this.broadcast();
  }

  setClearText(val: boolean) {
    this.clearText = val;
    this.broadcast();
  }

  toggleClearText() {
    this.clearText = !this.clearText;
    this.broadcast();
  }

  setAlertText(val: string) {
    this.alertText = val;
    this.broadcast();
  }
}

export const presentationStore = new PresentationStore();
