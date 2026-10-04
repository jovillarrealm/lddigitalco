// LDDIGITALCO — Manejador de Resiliencia de Red y Sincronización en Segundo Plano
// Cumple con ADR 0009 y GUIA_DE_ESTILO.md (Accesibilidad Senior WCAG AAA, tono empático y no alarmista)

(function () {
  'use strict';

  var OFFLINE_STORAGE_KEY = 'lms_offline_progress_queue';
  var OFFLINE_MESSAGE =
    'Sin conexión a internet por el momento. ¡No te preocupes! Tu avance está a salvo en tu dispositivo y se guardará automáticamente cuando regrese la conexión.';
  var SYNC_RESTORED_MESSAGE =
    '¡Conexión restaurada! Tu avance se ha sincronizado correctamente.';

  var isSyncing = false;
  var bannerTimer = null;

  /**
   * Obtiene la cola de microcápsulas pendientes desde localStorage
   * @returns {Array<{microcapsulaSlug: string, completado: boolean, rutaSlug?: string, timestamp: number}>}
   */
  function getQueue() {
    try {
      var raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Error al leer cola offline:', e);
      return [];
    }
  }

  /**
   * Guarda la cola en localStorage
   * @param {Array} queue
   */
  function saveQueue(queue) {
    try {
      if (!queue || queue.length === 0) {
        localStorage.removeItem(OFFLINE_STORAGE_KEY);
      } else {
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(queue));
      }
    } catch (e) {
      console.error('Error al persistir cola offline en localStorage:', e);
    }
  }

  /**
   * Agrega o actualiza un elemento en la cola con desduplicación por microcapsulaSlug
   */
  function enqueue(item) {
    var queue = getQueue();
    var existingIdx = -1;
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].microcapsulaSlug === item.microcapsulaSlug) {
        existingIdx = i;
        break;
      }
    }

    if (existingIdx >= 0) {
      queue[existingIdx] = item;
    } else {
      queue.push(item);
    }

    saveQueue(queue);
  }

  /**
   * Comprueba si el dispositivo tiene conexión a internet
   */
  function isOnline() {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  }

  /**
   * Muestra el banner empático en el portal de alumnos
   * @param {'offline'|'restored'} type
   * @param {string} customMsg
   */
  function showBanner(type, customMsg) {
    var banner = document.getElementById('offline-status-banner');
    var iconEl = document.getElementById('offline-banner-icon');
    var titleEl = document.getElementById('offline-banner-title');
    var msgEl = document.getElementById('offline-banner-message');

    if (bannerTimer) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }

    if (!banner) {
      // Si el elemento no existe aún en el DOM, crearlo flotante de respaldo
      banner = document.createElement('div');
      banner.id = 'offline-status-banner';
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      banner.className =
        'fixed top-5 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-2xl p-5 rounded-2xl border-2 shadow-2xl transition-all duration-300';
      document.body.appendChild(banner);
    }

    if (type === 'offline') {
      var message = customMsg || OFFLINE_MESSAGE;
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
      var message = customMsg || SYNC_RESTORED_MESSAGE;
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

      // Auto-ocultar el mensaje de éxito después de 6 segundos
      bannerTimer = setTimeout(function () {
        hideBanner();
      }, 6000);
    }
  }

  /**
   * Oculta el banner informativo
   */
  function hideBanner() {
    var banner = document.getElementById('offline-status-banner');
    if (banner) {
      banner.classList.add('hidden');
    }
  }

  /**
   * Guarda el progreso: directo a la API si está online, o a localStorage si está offline o si la llamada falla
   * @param {{microcapsulaSlug: string, completado?: boolean, rutaSlug?: string}} payload
   * @returns {Promise<{success: boolean, queued: boolean, synced: boolean, data?: any}>}
   */
  async function saveProgress(payload) {
    var slug = payload.microcapsulaSlug;
    var completado = payload.completado !== false;
    var rutaSlug = payload.rutaSlug;

    // Si el navegador reporta estar offline
    if (!isOnline()) {
      enqueue({
        microcapsulaSlug: slug,
        completado: completado,
        rutaSlug: rutaSlug,
        timestamp: Date.now(),
      });

      showBanner('offline');

      return {
        success: true,
        queued: true,
        synced: false,
      };
    }

    // Intentar sincronización directa con el servidor
    try {
      var res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          microcapsulaSlug: slug,
          completado: completado,
          rutaSlug: rutaSlug,
        }),
      });

      if (!res.ok) {
        if (res.status >= 500 || res.status === 0) {
          throw new Error('Fallo de servidor / red');
        }
      }

      var data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = {};
      }

      return {
        success: res.ok,
        queued: false,
        synced: res.ok,
        data: data,
      };
    } catch (networkError) {
      // Si la red se cayó en pleno envío, capturar en cola offline
      enqueue({
        microcapsulaSlug: slug,
        completado: completado,
        rutaSlug: rutaSlug,
        timestamp: Date.now(),
      });

      showBanner('offline');

      return {
        success: true,
        queued: true,
        synced: false,
      };
    }
  }

  /**
   * Sincroniza en segundo plano todos los elementos acumulados en la cola hacia la API
   * @returns {Promise<{syncedCount: number, slugs: string[]}>}
   */
  async function flushQueue() {
    if (isSyncing) return { syncedCount: 0, slugs: [] };
    var queue = getQueue();
    if (queue.length === 0) return { syncedCount: 0, slugs: [] };

    isSyncing = true;
    var syncedSlugs = [];
    var remainingQueue = [];

    for (var i = 0; i < queue.length; i++) {
      var item = queue[i];
      try {
        var res = await fetch('/api/progress', {
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
        // La red aún no es estable, retener este y los siguientes elementos
        remainingQueue.push(item);
      }
    }

    saveQueue(remainingQueue);
    isSyncing = false;

    if (syncedSlugs.length > 0) {
      showBanner('restored');

      // Notificar a toda la página que se completó una sincronización
      window.dispatchEvent(
        new CustomEvent('lms:sync-completed', {
          detail: {
            syncedCount: syncedSlugs.length,
            slugs: syncedSlugs,
          },
        })
      );
    }

    return {
      syncedCount: syncedSlugs.length,
      slugs: syncedSlugs,
    };
  }

  /**
   * Configura oyentes para los eventos de red y el botón de cerrar banner
   */
  function initListeners() {
    window.addEventListener('online', function () {
      flushQueue();
    });

    window.addEventListener('offline', function () {
      showBanner('offline');
    });

    // Delegación o asignación para el botón de cerrar banner
    var closeBtn = document.getElementById('banner-close') || document.getElementById('offline-banner-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', hideBanner);
    }

    // Al cargar la página: si ya está offline, mostrar aviso tranquilizador
    if (!isOnline()) {
      showBanner('offline');
    } else {
      // Si está online y hay pendientes de una sesión anterior, vaciar cola
      var existingQueue = getQueue();
      if (existingQueue.length > 0) {
        flushQueue();
      }
    }
  }

  // Exponer API pública en window.offlineSyncManager
  window.offlineSyncManager = {
    isOnline: isOnline,
    getQueue: getQueue,
    saveProgress: saveProgress,
    flushQueue: flushQueue,
    showBanner: showBanner,
    hideBanner: hideBanner,
    OFFLINE_MESSAGE: OFFLINE_MESSAGE,
    SYNC_RESTORED_MESSAGE: SYNC_RESTORED_MESSAGE,
    OFFLINE_STORAGE_KEY: OFFLINE_STORAGE_KEY,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initListeners);
  } else {
    initListeners();
  }
})();
