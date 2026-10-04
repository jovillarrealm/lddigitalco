export const OFFLINE_STORAGE_KEY = 'lms_offline_progress_queue';

export const OFFLINE_MESSAGE =
  'Sin conexión a internet por el momento. ¡No te preocupes! Tu avance está a salvo en tu dispositivo y se guardará automáticamente cuando regrese la conexión.';

export const SYNC_RESTORED_MESSAGE =
  '¡Conexión restaurada! Tu avance se ha sincronizado correctamente.';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface QueueItem {
  microcapsulaSlug: string;
  completado: boolean;
  rutaSlug?: string;
  timestamp: number;
}

export interface SaveProgressPayload {
  microcapsulaSlug: string;
  completado?: boolean;
  rutaSlug?: string;
}

export interface SaveProgressResult {
  success: boolean;
  queued: boolean;
  synced: boolean;
  error?: string;
  data?: any;
}

export interface SyncNotification {
  type: 'offline' | 'restored' | 'info';
  message: string;
}

export interface WindowLike {
  addEventListener: (event: string, listener: (e: any) => any) => void;
  removeEventListener: (event: string, listener: (e: any) => any) => void;
}

export interface SyncManagerOptions {
  storageKey?: string;
  storage?: StorageAdapter;
  apiEndpoint?: string;
  isOnline?: () => boolean;
  fetchFn?: typeof fetch;
  onNotification?: (notification: SyncNotification) => void;
  onSyncSuccess?: (result: { syncedCount: number; slugs: string[] }) => void;
  windowObj?: WindowLike;
}

export class SyncManager {
  private storageKey: string;
  private storage: StorageAdapter;
  private isOnlineFn: () => boolean;
  private apiEndpoint: string;
  private fetchFn: typeof fetch;
  private onNotification?: (notification: SyncNotification) => void;
  private onSyncSuccess?: (result: { syncedCount: number; slugs: string[] }) => void;
  private windowObj?: WindowLike;
  private boundOnlineHandler?: (e: any) => Promise<void>;
  private boundOfflineHandler?: (e: any) => void;

  constructor(options: SyncManagerOptions = {}) {
    this.storageKey = options.storageKey || OFFLINE_STORAGE_KEY;
    this.storage = options.storage || {
      getItem: (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null),
      setItem: (k, v) => {
        if (typeof localStorage !== 'undefined') localStorage.setItem(k, v);
      },
      removeItem: (k) => {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(k);
      },
    };
    this.isOnlineFn =
      options.isOnline ||
      (() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
    this.apiEndpoint = options.apiEndpoint || '/api/progress';
    this.fetchFn =
      options.fetchFn ||
      (typeof fetch !== 'undefined'
        ? fetch.bind(globalThis)
        : (async () => ({} as Response)));
    this.onNotification = options.onNotification;
    this.onSyncSuccess = options.onSyncSuccess;

    const win =
      options.windowObj ||
      (typeof window !== 'undefined' ? (window as unknown as WindowLike) : undefined);

    if (win) {
      this.windowObj = win;
      this.setupEventListeners();
    }
  }

  private setupEventListeners(): void {
    if (!this.windowObj) return;

    this.boundOnlineHandler = async () => {
      await this.flushQueue();
    };

    this.boundOfflineHandler = () => {
      this.notify({
        type: 'offline',
        message: OFFLINE_MESSAGE,
      });
    };

    this.windowObj.addEventListener('online', this.boundOnlineHandler);
    this.windowObj.addEventListener('offline', this.boundOfflineHandler);
  }

  destroy(): void {
    if (this.windowObj) {
      if (this.boundOnlineHandler) {
        this.windowObj.removeEventListener('online', this.boundOnlineHandler);
      }
      if (this.boundOfflineHandler) {
        this.windowObj.removeEventListener('offline', this.boundOfflineHandler);
      }
    }
  }

  getQueue(): QueueItem[] {
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueueItem[]): void {
    try {
      if (queue.length === 0) {
        this.storage.removeItem(this.storageKey);
      } else {
        this.storage.setItem(this.storageKey, JSON.stringify(queue));
      }
    } catch (e) {
      console.error('Error saving offline progress queue:', e);
    }
  }

  enqueue(item: QueueItem): void {
    const queue = this.getQueue();
    const existingIndex = queue.findIndex(
      (q) => q.microcapsulaSlug === item.microcapsulaSlug
    );
    if (existingIndex >= 0) {
      queue[existingIndex] = item;
    } else {
      queue.push(item);
    }
    this.saveQueue(queue);
  }

  clearQueue(): void {
    this.storage.removeItem(this.storageKey);
  }

  async saveProgress(payload: SaveProgressPayload): Promise<SaveProgressResult> {
    const isOnline = this.isOnlineFn();
    const completado = payload.completado !== false;

    if (!isOnline) {
      this.enqueue({
        microcapsulaSlug: payload.microcapsulaSlug,
        completado,
        rutaSlug: payload.rutaSlug,
        timestamp: Date.now(),
      });

      this.notify({
        type: 'offline',
        message: OFFLINE_MESSAGE,
      });

      return {
        success: true,
        queued: true,
        synced: false,
      };
    }

    try {
      const res = await this.fetchFn(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          microcapsulaSlug: payload.microcapsulaSlug,
          completado,
          rutaSlug: payload.rutaSlug,
        }),
      });

      if (!res.ok && (res.status >= 500 || res.status === 0)) {
        throw new Error(`Server or network error with status ${res.status}`);
      }

      const data = await res.json().catch(() => ({}));

      return {
        success: res.ok,
        queued: false,
        synced: res.ok,
        data,
      };
    } catch (networkErr) {
      // Network error during fetch, fall back to offline queue
      this.enqueue({
        microcapsulaSlug: payload.microcapsulaSlug,
        completado,
        rutaSlug: payload.rutaSlug,
        timestamp: Date.now(),
      });

      this.notify({
        type: 'offline',
        message: OFFLINE_MESSAGE,
      });

      return {
        success: true,
        queued: true,
        synced: false,
      };
    }
  }

  async flushQueue(): Promise<{ syncedCount: number; slugs: string[] }> {
    const queue = this.getQueue();
    if (queue.length === 0) {
      return { syncedCount: 0, slugs: [] };
    }

    const syncedSlugs: string[] = [];
    const remainingQueue: QueueItem[] = [];

    for (const item of queue) {
      try {
        const res = await this.fetchFn(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            microcapsulaSlug: item.microcapsulaSlug,
            completado: item.completado,
            rutaSlug: item.rutaSlug,
          }),
        });

        if (res.ok) {
          syncedSlugs.push(item.microcapsulaSlug);
        } else {
          remainingQueue.push(item);
        }
      } catch (err) {
        remainingQueue.push(item);
      }
    }

    this.saveQueue(remainingQueue);

    if (syncedSlugs.length > 0) {
      this.notify({
        type: 'restored',
        message: SYNC_RESTORED_MESSAGE,
      });

      if (this.onSyncSuccess) {
        this.onSyncSuccess({
          syncedCount: syncedSlugs.length,
          slugs: syncedSlugs,
        });
      }
    }

    return {
      syncedCount: syncedSlugs.length,
      slugs: syncedSlugs,
    };
  }

  private notify(notification: SyncNotification): void {
    if (this.onNotification) {
      this.onNotification(notification);
    }
  }
}

let globalSyncManager: SyncManager | null = null;
let bannerTimer: any = null;

export function showOfflineBanner(type: 'offline' | 'restored', customMsg?: string): void {
  if (typeof document === 'undefined') return;

  const banner = document.getElementById('offline-status-banner');
  const iconEl = document.getElementById('offline-banner-icon');
  const titleEl = document.getElementById('offline-banner-title');
  const msgEl = document.getElementById('offline-banner-message');

  if (bannerTimer) {
    clearTimeout(bannerTimer);
    bannerTimer = null;
  }

  if (!banner) return;

  if (type === 'offline') {
    const message = customMsg || OFFLINE_MESSAGE;
    banner.className =
      'mb-6 p-5 rounded-2xl bg-amber-950/90 border-2 border-amber-500/80 text-white shadow-2xl transition-all duration-300';
    if (iconEl) iconEl.textContent = '💾';
    if (titleEl) {
      titleEl.className = 'font-bold text-base sm:text-lg mb-1 font-tech text-amber-300';
      titleEl.textContent = 'Tu avance está protegido en este dispositivo';
    }
    if (msgEl) {
      msgEl.className = 'text-sm sm:text-base leading-relaxed text-slate-100';
      msgEl.textContent = message;
    }
    banner.classList.remove('hidden');
  } else if (type === 'restored') {
    const message = customMsg || SYNC_RESTORED_MESSAGE;
    banner.className =
      'mb-6 p-5 rounded-2xl bg-emerald-950/90 border-2 border-emerald-400 text-white shadow-2xl glow-green transition-all duration-300';
    if (iconEl) iconEl.textContent = '🎉';
    if (titleEl) {
      titleEl.className = 'font-bold text-base sm:text-lg mb-1 font-tech text-emerald-300';
      titleEl.textContent = '¡Conexión restaurada!';
    }
    if (msgEl) {
      msgEl.className = 'text-sm sm:text-base leading-relaxed text-slate-100';
      msgEl.textContent = message;
    }
    banner.classList.remove('hidden');

    bannerTimer = setTimeout(() => {
      hideOfflineBanner();
    }, 6000);
  }
}

export function hideOfflineBanner(): void {
  if (typeof document === 'undefined') return;
  const banner = document.getElementById('offline-status-banner');
  if (banner) {
    banner.classList.add('hidden');
  }
}

export function initBrowserOfflineSync(): SyncManager {
  if (typeof window === 'undefined') {
    return new SyncManager();
  }

  if (globalSyncManager) {
    return globalSyncManager;
  }

  const manager = new SyncManager({
    onNotification: (notif) => {
      showOfflineBanner(notif.type === 'offline' ? 'offline' : 'restored', notif.message);
    },
    onSyncSuccess: (res) => {
      window.dispatchEvent(
        new CustomEvent('lms:sync-completed', {
          detail: {
            syncedCount: res.syncedCount,
            slugs: res.slugs,
          },
        })
      );
    },
  });

  const closeBtn = document.getElementById('banner-close') || document.getElementById('offline-banner-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideOfflineBanner);
  }

  (window as any).offlineSyncManager = {
    isOnline: () => (typeof navigator !== 'undefined' ? navigator.onLine : true),
    getQueue: () => manager.getQueue(),
    saveProgress: (payload: SaveProgressPayload) => manager.saveProgress(payload),
    flushQueue: () => manager.flushQueue(),
    showBanner: (type: 'offline' | 'restored', msg?: string) => showOfflineBanner(type, msg),
    hideBanner: () => hideOfflineBanner(),
    OFFLINE_MESSAGE,
    SYNC_RESTORED_MESSAGE,
    OFFLINE_STORAGE_KEY,
  };

  if (!navigator.onLine) {
    showOfflineBanner('offline');
  } else if (manager.getQueue().length > 0) {
    manager.flushQueue();
  }

  globalSyncManager = manager;
  return manager;
}

