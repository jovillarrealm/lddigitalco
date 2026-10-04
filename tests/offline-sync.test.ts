import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncManager, OFFLINE_STORAGE_KEY } from '../src/lib/offline/sync-manager';
import { PlayerController } from '../src/lib/courses/player-controller';
import { getRouteBySlug } from '../src/lib/courses/catalog';

describe('Offline Sync Manager', () => {
  let memoryStorage: Record<string, string>;
  let mockStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };

  beforeEach(() => {
    memoryStorage = {};
    mockStorage = {
      getItem: (key: string) => memoryStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        memoryStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete memoryStorage[key];
      },
    };
  });

  it('adds items to offline queue when offline and persists to storage', async () => {
    const isOnline = vi.fn().mockReturnValue(false);
    const syncManager = new SyncManager({
      storage: mockStorage,
      isOnline,
    });

    const result = await syncManager.saveProgress({
      microcapsulaSlug: 'configurar-celular-vista',
      completado: true,
      rutaSlug: 'ciberseguridad-whatsapp',
    });

    expect(result.queued).toBe(true);
    expect(result.synced).toBe(false);

    const queue = syncManager.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].microcapsulaSlug).toBe('configurar-celular-vista');
    expect(queue[0].completado).toBe(true);

    // Verify storage persistence under OFFLINE_STORAGE_KEY ('lms_offline_progress_queue')
    expect(memoryStorage[OFFLINE_STORAGE_KEY]).toBeDefined();
    const stored = JSON.parse(memoryStorage[OFFLINE_STORAGE_KEY]);
    expect(stored).toHaveLength(1);
    expect(stored[0].microcapsulaSlug).toBe('configurar-celular-vista');
  });

  it('de-duplicates queue items by microcapsulaSlug, updating with the latest state', async () => {
    const isOnline = vi.fn().mockReturnValue(false);
    const syncManager = new SyncManager({
      storage: mockStorage,
      isOnline,
    });

    // First: mark completed
    await syncManager.saveProgress({
      microcapsulaSlug: 'configurar-celular-vista',
      completado: true,
      rutaSlug: 'ciberseguridad-whatsapp',
    });

    // Second: mark another capsule completed
    await syncManager.saveProgress({
      microcapsulaSlug: 'notas-voz-fotos-whatsapp',
      completado: true,
      rutaSlug: 'ciberseguridad-whatsapp',
    });

    // Third: toggle the first capsule to uncompleted (false)
    await syncManager.saveProgress({
      microcapsulaSlug: 'configurar-celular-vista',
      completado: false,
      rutaSlug: 'ciberseguridad-whatsapp',
    });

    const queue = syncManager.getQueue();
    // Must contain exactly 2 items, not 3
    expect(queue).toHaveLength(2);

    const firstCapsuleItem = queue.find(
      (item) => item.microcapsulaSlug === 'configurar-celular-vista'
    );
    expect(firstCapsuleItem).toBeDefined();
    expect(firstCapsuleItem?.completado).toBe(false);

    const secondCapsuleItem = queue.find(
      (item) => item.microcapsulaSlug === 'notas-voz-fotos-whatsapp'
    );
    expect(secondCapsuleItem).toBeDefined();
    expect(secondCapsuleItem?.completado).toBe(true);
  });

  it('queues action and emits empathetic notification if fetch fails due to network error when seemingly online', async () => {
    const isOnline = vi.fn().mockReturnValue(true);
    const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const onNotification = vi.fn();

    const syncManager = new SyncManager({
      storage: mockStorage,
      isOnline,
      fetchFn: mockFetch,
      onNotification,
    });

    const result = await syncManager.saveProgress({
      microcapsulaSlug: 'identificar-estafas-whatsapp',
      completado: true,
      rutaSlug: 'ciberseguridad-whatsapp',
    });

    expect(result.queued).toBe(true);
    expect(result.synced).toBe(false);

    // Queue has the item
    const queue = syncManager.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].microcapsulaSlug).toBe('identificar-estafas-whatsapp');

    // Notification contains empathetic offline message
    expect(onNotification).toHaveBeenCalledWith({
      type: 'offline',
      message:
        'Sin conexión a internet por el momento. ¡No te preocupes! Tu avance está a salvo en tu dispositivo y se guardará automáticamente cuando regrese la conexión.',
    });
  });

  it('flushes pending queue to API and emits warm confirmation when reconnected', async () => {
    let onlineState = false;
    const isOnline = vi.fn(() => onlineState);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        progreso: { completadasSlugs: ['configurar-celular-vista'] },
      }),
    });
    const onNotification = vi.fn();
    const onSyncSuccess = vi.fn();

    const listeners: Record<string, Function[]> = {};
    const mockWindow = {
      addEventListener: (event: string, fn: Function) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(fn);
      },
      removeEventListener: (event: string, fn: Function) => {
        listeners[event] = (listeners[event] || []).filter((f) => f !== fn);
      },
    };

    const syncManager = new SyncManager({
      storage: mockStorage,
      isOnline,
      fetchFn: mockFetch,
      onNotification,
      onSyncSuccess,
      windowObj: mockWindow as any,
    });

    // Enqueue an item while offline
    await syncManager.saveProgress({
      microcapsulaSlug: 'configurar-celular-vista',
      completado: true,
      rutaSlug: 'ciberseguridad-whatsapp',
    });

    expect(syncManager.getQueue()).toHaveLength(1);

    // Now connection comes back online!
    onlineState = true;
    onNotification.mockClear();

    // Trigger online event
    const onlineHandlers = listeners['online'] || [];
    expect(onlineHandlers.length).toBeGreaterThan(0);
    for (const handler of onlineHandlers) {
      await handler(new Event('online'));
    }

    // Fetch was called with the queued item
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/progress',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          microcapsulaSlug: 'configurar-celular-vista',
          completado: true,
          rutaSlug: 'ciberseguridad-whatsapp',
        }),
      })
    );

    // Queue is cleared in storage
    expect(syncManager.getQueue()).toHaveLength(0);

    // Warm confirmation emitted
    expect(onNotification).toHaveBeenCalledWith({
      type: 'restored',
      message: '¡Conexión restaurada! Tu avance se ha sincronizado correctamente.',
    });

    // onSyncSuccess callback called
    expect(onSyncSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        syncedCount: 1,
        slugs: ['configurar-celular-vista'],
      })
    );
  });

  it('handles partial failures gracefully leaving unsynced items in queue for future retry', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // First item succeeds
        return { ok: true, status: 200, json: async () => ({ success: true }) };
      }
      // Second item fails due to connection drop
      throw new TypeError('Network connection lost mid-sync');
    });

    const onNotification = vi.fn();
    const syncManager = new SyncManager({
      storage: mockStorage,
      fetchFn: mockFetch,
      onNotification,
    });

    // Enqueue two items
    syncManager.enqueue({
      microcapsulaSlug: 'c1',
      completado: true,
      timestamp: Date.now(),
    });
    syncManager.enqueue({
      microcapsulaSlug: 'c2',
      completado: true,
      timestamp: Date.now(),
    });

    expect(syncManager.getQueue()).toHaveLength(2);

    const result = await syncManager.flushQueue();

    expect(result.syncedCount).toBe(1);
    expect(result.slugs).toEqual(['c1']);

    // 'c2' remains in queue for future retry
    const remaining = syncManager.getQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].microcapsulaSlug).toBe('c2');
  });

  it('does not emit sync restored notification if queue was already empty when coming online', async () => {
    const onNotification = vi.fn();
    const mockFetch = vi.fn();

    const listeners: Record<string, Function[]> = {};
    const mockWindow = {
      addEventListener: (event: string, fn: Function) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(fn);
      },
      removeEventListener: vi.fn(),
    };

    const syncManager = new SyncManager({
      storage: mockStorage,
      fetchFn: mockFetch,
      onNotification,
      windowObj: mockWindow as any,
    });

    // Queue is empty
    expect(syncManager.getQueue()).toHaveLength(0);

    const onlineHandlers = listeners['online'] || [];
    for (const handler of onlineHandlers) {
      await handler(new Event('online'));
    }

    expect(mockFetch).not.toHaveBeenCalled();
    expect(onNotification).not.toHaveBeenCalled();
  });

  it('emits empathetic offline message when window fires offline event', () => {
    const onNotification = vi.fn();
    const listeners: Record<string, Function[]> = {};
    const mockWindow = {
      addEventListener: (event: string, fn: Function) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(fn);
      },
      removeEventListener: vi.fn(),
    };

    new SyncManager({
      storage: mockStorage,
      onNotification,
      windowObj: mockWindow as any,
    });

    const offlineHandlers = listeners['offline'] || [];
    expect(offlineHandlers.length).toBeGreaterThan(0);
    offlineHandlers[0](new Event('offline'));

    expect(onNotification).toHaveBeenCalledWith({
      type: 'offline',
      message:
        'Sin conexión a internet por el momento. ¡No te preocupes! Tu avance está a salvo en tu dispositivo y se guardará automáticamente cuando regrese la conexión.',
    });
  });

  it('integrates seamlessly with PlayerController to route player progress updates offline and online', async () => {
    const route = getRouteBySlug('ciberseguridad-whatsapp')!;
    let isConnected = false;
    const isOnline = vi.fn(() => isConnected);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    const syncManager = new SyncManager({
      storage: mockStorage,
      isOnline,
      fetchFn: mockFetch,
    });

    // PlayerController configured with syncManager.saveProgress
    const controller = new PlayerController({
      route,
      initialCapsuleIndex: 0,
      saveProgressFn: (capsuleSlug, completed) =>
        syncManager.saveProgress({
          microcapsulaSlug: capsuleSlug,
          completado: completed,
          rutaSlug: route.slug,
        }),
    });

    // 1. When offline: student marks capsule complete
    await controller.toggleComplete();

    expect(controller.isCurrentCapsuleCompleted()).toBe(true);
    expect(syncManager.getQueue()).toHaveLength(1);
    expect(syncManager.getQueue()[0].microcapsulaSlug).toBe('configurar-celular-vista');
    expect(syncManager.getQueue()[0].completado).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();

    // 2. Reconnect and flush queue
    isConnected = true;
    const flushResult = await syncManager.flushQueue();

    expect(flushResult.syncedCount).toBe(1);
    expect(syncManager.getQueue()).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/progress',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          microcapsulaSlug: 'configurar-celular-vista',
          completado: true,
          rutaSlug: 'ciberseguridad-whatsapp',
        }),
      })
    );

    // 3. When online: student completes next capsule on video end
    mockFetch.mockClear();
    controller.nextCapsule();
    await controller.handlePlayerEnded();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/progress',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          microcapsulaSlug: 'notas-voz-fotos-whatsapp',
          completado: true,
          rutaSlug: 'ciberseguridad-whatsapp',
        }),
      })
    );
    expect(syncManager.getQueue()).toHaveLength(0);
  });
});
