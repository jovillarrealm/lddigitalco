// LDDIGITALCO — Seam de Motor de Reproducción de Video
// Cumple con codebase-design: dos adaptadores (YouTube en producción, Mock para pruebas y fallback)

export interface VideoPlayerAdapter {
  mount(elementId: string, videoId: string, onReady?: () => void): void;
  loadVideo(videoId: string): void;
  onEnded(callback: () => void): void;
  destroy(): void;
}

/**
 * Adaptador YouTube: Encapsula el ciclo de vida y eventos del IFrame Player API
 */
export class YouTubeIframeAdapter implements VideoPlayerAdapter {
  private player: any = null;
  private onEndedCallback: (() => void) | null = null;
  private isReady = false;

  mount(elementId: string, videoId: string, onReady?: () => void): void {
    const initPlayer = () => {
      if (typeof window === 'undefined' || !(window as any).YT || !(window as any).YT.Player) {
        return;
      }
      this.player = new (window as any).YT.Player(elementId, {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          controls: 1,
        },
        events: {
          onReady: () => {
            this.isReady = true;
            if (onReady) onReady();
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.ENDED === 0
            if (event.data === 0 && this.onEndedCallback) {
              this.onEndedCallback();
            }
          },
        },
      });
    };

    if (typeof window !== 'undefined') {
      if ((window as any).YT && (window as any).YT.Player) {
        initPlayer();
      } else {
        const existing = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => {
          if (existing) existing();
          initPlayer();
        };

        if (!document.getElementById('yt-iframe-api')) {
          const tag = document.createElement('script');
          tag.id = 'yt-iframe-api';
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
        }
      }
    }
  }

  getIsReady(): boolean {
    return this.isReady;
  }

  loadVideo(videoId: string): void {
    if (this.player && this.player.loadVideoById) {
      this.player.loadVideoById(videoId);
    }
  }

  onEnded(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  destroy(): void {
    if (this.player && this.player.destroy) {
      try {
        this.player.destroy();
      } catch {
        // noop
      }
    }
    this.player = null;
    this.isReady = false;
  }
}

/**
 * Adaptador Mock: Para pruebas unitarias y entornos sin red
 */
export class MockVideoAdapter implements VideoPlayerAdapter {
  public mountedElementId: string | null = null;
  public currentVideoId: string | null = null;
  private onEndedCallback: (() => void) | null = null;
  public isReady = false;

  mount(elementId: string, videoId: string, onReady?: () => void): void {
    this.mountedElementId = elementId;
    this.currentVideoId = videoId;
    this.isReady = true;
    if (onReady) onReady();
  }

  loadVideo(videoId: string): void {
    this.currentVideoId = videoId;
  }

  onEnded(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  triggerEnded(): void {
    if (this.onEndedCallback) {
      this.onEndedCallback();
    }
  }

  destroy(): void {
    this.mountedElementId = null;
    this.currentVideoId = null;
    this.isReady = false;
  }
}
