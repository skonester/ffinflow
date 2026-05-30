declare global {
  // Shared global state variables
  var playlist: any[];
  var store: any;
  var currentIndex: number;
  var isLooping: boolean;
  var isLoopingCurrent: boolean;
  var isShuffling: boolean;
  var shuffledIndices: number[];
  var currentShuffleIndex: number;
  var clickTimeout: any;
  var controlsTimeout: any;
  var isFullscreen: boolean;
  var seekTargetTime: number | null;
  var isSeekingSmooth: boolean;
  var lastSeekUpdate: number;
  var isDragging: boolean;
  var animationFrame: any;
  var lastVolume: number;
  var volumeChanged: boolean;
  var mediaErrorDialogOpen: boolean;
  var hardwareFallbackAttemptedPath: string | null;
  var preparedFallbackAttemptedPath: string | null;
  
  // DOM Elements declared globally in renderer
  var mediaPlayer: HTMLVideoElement;
  var timeSlider: HTMLInputElement;
  var timeDisplay: HTMLSpanElement;
  var fullscreenBtn: HTMLButtonElement;
  var shuffleBtn: HTMLButtonElement;
  var loopBtn: HTMLButtonElement;
  var playlistElement: HTMLElement;
  var playerSection: HTMLElement;
  var playlistPanel: HTMLElement;
  var appContainer: HTMLElement;
  var clearPlaylistBtn: HTMLButtonElement;
  var togglePlaylistButton: HTMLButtonElement;
  var volumeSlider: HTMLInputElement;
  var previousBtn: HTMLButtonElement;
  var nextBtn: HTMLButtonElement;
  var playPauseBtn: HTMLButtonElement;
  var muteBtn: HTMLButtonElement;
  
  // Custom globals injected from other modules
  var ipcRenderer: any;
  var showControls: () => void;
  var supportedFormats: string[];
  var addToPlaylist: (filePath: string) => Promise<any>;
  var MINIMUM_POSITION: number;
  var INACTIVITY_TIMEOUT: number;
  var MIN_WINDOW_WIDTH: number;
  
  // Shared helper classes & instances
  var subtitlesManager: any;
  var hardwareAcceleration: any;

  // Shared functions
  function playFile(filePath: string): Promise<void>;
  function updatePlayPauseIcon(paused: boolean): void;
  function updatePlaylistUI(): void;
  function generateShuffledPlaylist(currentVideoIndex: number): number[];
  function togglePlayPause(): void;
  function playPrevious(): void;
  function playNext(): void;
  function toggleMute(): void;
  function updateVolume(): void;
  function applyTheme(themeName: string): void;
  function getCurrentTheme(): string;
  function formatTime(seconds: number): string;
  function debounce(func: Function, wait: number): Function;
}

declare global {
  interface Document {
    webkitFullscreenElement?: Element;
    webkitExitFullscreen?: () => Promise<void>;
    webkitFullscreenEnabled?: boolean;
  }
  interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
  }
  namespace NodeJS {
    interface Process {
      resourcesPath?: string;
    }
  }
}

export {};
