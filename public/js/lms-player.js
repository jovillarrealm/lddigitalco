// LDDIGITALCO — Reproductor de Microcápsulas y Gestión de Progreso Formativo
// Cumple con la Guía de Estilo (Neón Esmeralda #00FF87, WCAG AAA Senior-friendly)

(function () {
  'use strict';

  // Estado del reproductor y progreso
  let state = {
    route: null,
    currentIndex: 0,
    completedSlugs: new Set(),
    isEnrolledFull: false,
    ytPlayer: null,
    isYtReady: false,
    isSaving: false,
  };

  /**
   * Inicialización del portal del alumno
   */
  function init() {
    loadInitialData();
    renderCurrentCapsule();
    updateProgressUI();
    renderCurriculum();
    initYouTubeAPI();
    setupEventListeners();
  }

  /**
   * Carga datos iniciales provistos por el servidor (SSR) o valores por defecto
   */
  function loadInitialData() {
    const dataEl = document.getElementById('lms-initial-data');
    if (dataEl) {
      try {
        const parsed = JSON.parse(dataEl.textContent || '{}');
        if (parsed.route) state.route = parsed.route;
        if (parsed.completedSlugs && Array.isArray(parsed.completedSlugs)) {
          state.completedSlugs = new Set(parsed.completedSlugs);
        }
        if (typeof parsed.isEnrolledFull === 'boolean') {
          state.isEnrolledFull = parsed.isEnrolledFull;
        } else if (parsed.student) {
          state.isEnrolledFull =
            parsed.student.nivel_acceso === 'inscripcion_completa' ||
            parsed.student.rol === 'admin' ||
            parsed.student.rol === 'tutor';
        }
      } catch (err) {
        console.error('Error al parsear lms-initial-data:', err);
      }
    }

    // Fallback si no hay SSR data disponible
    if (!state.route || !state.route.microcapsulas || state.route.microcapsulas.length === 0) {
      state.route = {
        id: 'ruta-ciberseguridad-whatsapp',
        slug: 'ciberseguridad-whatsapp',
        titulo: 'Ciberseguridad y Prevención de Estafas en WhatsApp',
        microcapsulas: [
          {
            id: 'cap-01',
            slug: 'configurar-celular-vista',
            titulo: 'Cápsula #1: Cómo configurar tu celular para no cansar la vista',
            descripcion: 'Aprende a aumentar el tamaño de letra, ajustar el brillo automático y activar el filtro de luz nocturna para leer sin fatiga visual.',
            duracion: '02:15',
            youtubeId: 'dQw4w9WgXcQ',
            resumen: 'Aumentar el tamaño del texto y activar el filtro de luz cálida reduce hasta un 80% la fatiga al leer en el celular. Puede activarlo en Ajustes > Pantalla.',
            orden: 1,
          },
          {
            id: 'cap-02',
            slug: 'notas-voz-fotos-whatsapp',
            titulo: 'Cápsula #2: Cómo enviar notas de voz y fotos por WhatsApp a tu familia',
            descripcion: 'Guía paso a paso para mandar audios manteniendo presionado el micrófono o bloqueándolo hacia arriba, y cómo compartir fotos con nitidez.',
            duracion: '02:40',
            youtubeId: 'jNQXAC9IVRw',
            resumen: 'Al enviar un audio largo, deslice el dedo hacia arriba sobre el candado para grabar con las manos libres sin miedo a que se corte.',
            orden: 2,
          },
          {
            id: 'cap-03',
            slug: 'identificar-estafas-whatsapp',
            titulo: 'Cápsula #3: Cómo identificar un mensaje o enlace de estafa en WhatsApp',
            descripcion: 'Aprende las 3 señales críticas de un mensaje fraudulento y qué hacer de inmediato para proteger tus cuentas.',
            duracion: '02:45',
            youtubeId: 'kJQP7kiw5Fk',
            resumen: 'Recuerde la regla de oro: Ningún banco o entidad solicita contraseñas por WhatsApp. Si un mensaje genera urgencia extrema, no abra el enlace y consulte primero con su tutor de LDDIGITALCO.',
            orden: 3,
          },
          {
            id: 'cap-04',
            slug: 'pedir-recetas-tramites-ia-voz',
            titulo: 'Cápsula #4: Cómo pedirle recetas, trámites e información a la IA con tu voz',
            descripcion: 'Aprende a usar los asistentes de inteligencia artificial como un acompañante diario: dile lo que necesitas y te responderá con claridad.',
            duracion: '03:10',
            youtubeId: 'L_LUpnjgPso',
            resumen: 'Hable con la IA como si hablara con una persona paciente. Pídale que le explique paso a paso cualquier trámite, receta o duda cotidiana.',
            orden: 4,
          },
        ],
      };
    }

    // Posicionarse en la primera microcápsula pendiente o en la 0
    const firstUnfinished = state.route.microcapsulas.findIndex(
      (c) => !state.completedSlugs.has(c.slug)
    );
    state.currentIndex = firstUnfinished !== -1 ? firstUnfinished : 0;
  }

  /**
   * Inicializa la API de YouTube para escuchar eventos de reproducción
   */
  function initYouTubeAPI() {
    const currentCapsule = getCurrentCapsule();
    if (!currentCapsule) return;

    // Verificar si ya existe la API de YouTube en window
    if (window.YT && window.YT.Player) {
      setupYTPlayer();
    } else {
      // Registrar callback global requerido por la API de YouTube
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof previousCallback === 'function') previousCallback();
        setupYTPlayer();
      };

      // Inyectar script de la API si aún no está presente
      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      }
    }
  }

  /**
   * Crea el reproductor interactivo con YT.Player
   */
  function setupYTPlayer() {
    const currentCapsule = getCurrentCapsule();
    if (!currentCapsule) return;

    const iframeEl = document.getElementById('youtube-iframe');
    if (!iframeEl) return;

    try {
      state.ytPlayer = new window.YT.Player('youtube-iframe', {
        events: {
          onReady: function () {
            state.isYtReady = true;
          },
          onStateChange: handleYTStateChange,
        },
      });
    } catch (err) {
      console.warn('No se pudo inicializar YT.Player directamente, usando fallback por iframe:', err);
    }
  }

  /**
   * Manejador de eventos de estado de YouTube
   * YT.PlayerState.ENDED === 0
   */
  function handleYTStateChange(event) {
    if (event.data === 0 || (window.YT && event.data === window.YT.PlayerState.ENDED)) {
      handleVideoEnded();
    }
  }

  /**
   * Se ejecuta automáticamente cuando el video de la microcápsula termina
   */
  async function handleVideoEnded() {
    const currentCapsule = getCurrentCapsule();
    if (!currentCapsule) return;

    if (!state.completedSlugs.has(currentCapsule.slug)) {
      await saveProgress(currentCapsule.slug, true);
      showToast('🎉 ¡Microcápsula completada! Progreso guardado automáticamente.');
    }
  }

  function getCurrentCapsule() {
    return state.route.microcapsulas[state.currentIndex];
  }

  /**
   * Carga una microcápsula específica por índice
   */
  function loadCapsule(index) {
    if (index < 0 || index >= state.route.microcapsulas.length) return;
    state.currentIndex = index;
    const capsule = getCurrentCapsule();

    // Actualizar reproductor de video
    const iframe = document.getElementById('youtube-iframe');
    const embedUrl = `https://www.youtube-nocookie.com/embed/${capsule.youtubeId}?enablejsapi=1&rel=0&modestbranding=1`;

    if (state.ytPlayer && state.isYtReady && typeof state.ytPlayer.loadVideoById === 'function') {
      try {
        state.ytPlayer.loadVideoById(capsule.youtubeId);
      } catch {
        if (iframe) iframe.src = embedUrl;
      }
    } else if (iframe) {
      iframe.src = embedUrl;
    }

    renderCurrentCapsule();
    renderCurriculum();
  }

  /**
   * Renderiza el encabezado, resumen y badges de la microcápsula actual
   */
  function renderCurrentCapsule() {
    const capsule = getCurrentCapsule();
    if (!capsule) return;

    const titleEl = document.getElementById('lesson-title');
    const durationEl = document.getElementById('lesson-duration');
    const summaryEl = document.getElementById('lesson-summary');
    const badgeEl = document.getElementById('completion-badge');
    const toggleBtn = document.getElementById('toggle-complete-btn');
    const toggleText = document.getElementById('toggle-complete-text');
    const prevBtn = document.getElementById('prev-lesson-btn');
    const nextBtn = document.getElementById('next-lesson-btn');

    if (titleEl) titleEl.textContent = capsule.titulo;
    if (durationEl) durationEl.textContent = `Duración: ${capsule.duracion} • Explicado paso a paso`;
    if (summaryEl) summaryEl.textContent = capsule.resumen;

    const isCompleted = state.completedSlugs.has(capsule.slug);

    // Badge «¡Completado!» verde esmeralda
    if (badgeEl) {
      if (isCompleted) {
        badgeEl.classList.remove('hidden');
        badgeEl.className =
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400 glow-border-green transition-all animate-pulse';
        badgeEl.innerHTML = '<span>✓</span> <span>¡Completado!</span>';
      } else {
        badgeEl.classList.add('hidden');
      }
    }

    // Botón manual de marcar / desmarcar
    if (toggleBtn && toggleText) {
      if (isCompleted) {
        toggleBtn.className =
          'px-5 py-3 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border-2 border-emerald-400 font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors';
        toggleText.textContent = '✓ Completada (clic para desmarcar)';
        toggleBtn.setAttribute('aria-pressed', 'true');
      } else {
        toggleBtn.className =
          'px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors';
        toggleText.textContent = '○ Marcar como completada';
        toggleBtn.setAttribute('aria-pressed', 'false');
      }
    }

    // Botones de navegación
    if (prevBtn) {
      prevBtn.disabled = state.currentIndex === 0;
      prevBtn.classList.toggle('opacity-50', state.currentIndex === 0);
      prevBtn.classList.toggle('cursor-not-allowed', state.currentIndex === 0);
    }

    if (nextBtn) {
      const isLast = state.currentIndex === state.route.microcapsulas.length - 1;
      const nextText = document.getElementById('next-lesson-text');
      if (nextText) {
        nextText.textContent = isLast ? 'Finalizar Módulo 🎉' : 'Siguiente Microcápsula →';
      }
    }

    // Actualizar datos del modal «Tengo una Duda» con el contexto de la cápsula (ADR 0006)
    const modalCapsuleTitle = document.getElementById('duda-modal-capsule-title');
    if (modalCapsuleTitle) {
      modalCapsuleTitle.textContent = capsule.titulo;
    }
    const modalCapsuleSlug = document.getElementById('duda-capsule-slug');
    if (modalCapsuleSlug) {
      modalCapsuleSlug.value = capsule.slug;
    }

    const dudaBtn = document.getElementById('doubt-btn');
    if (dudaBtn) {
      dudaBtn.onclick = function () {
        openDudaModal();
      };
    }
  }

  /**
   * Alterna el estado de completitud manualmente
   */
  async function toggleComplete() {
    const capsule = getCurrentCapsule();
    if (!capsule || state.isSaving) return;

    const currentlyCompleted = state.completedSlugs.has(capsule.slug);
    const newStatus = !currentlyCompleted;

    await saveProgress(capsule.slug, newStatus);
  }

  /**
   * Envía el estado de progreso a la API de D1 a través del gestor de resiliencia offline
   */
  async function saveProgress(microcapsulaSlug, completado) {
    state.isSaving = true;

    // Actualización optimista local
    if (completado) {
      state.completedSlugs.add(microcapsulaSlug);
    } else {
      state.completedSlugs.delete(microcapsulaSlug);
    }
    renderCurrentCapsule();
    updateProgressUI();
    renderCurriculum();

    try {
      if (window.offlineSyncManager && typeof window.offlineSyncManager.saveProgress === 'function') {
        const syncResult = await window.offlineSyncManager.saveProgress({
          microcapsulaSlug,
          completado,
          rutaSlug: state.route ? state.route.slug : undefined,
        });

        if (syncResult && syncResult.data && syncResult.data.progreso && Array.isArray(syncResult.data.progreso.completadasSlugs)) {
          state.completedSlugs = new Set(syncResult.data.progreso.completadasSlugs);
          updateProgressUI();
          renderCurriculum();
          renderCurrentCapsule();
        }
      } else {
        const res = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            microcapsulaSlug,
            completado,
            rutaSlug: state.route ? state.route.slug : undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.progreso && Array.isArray(data.progreso.completadasSlugs)) {
            state.completedSlugs = new Set(data.progreso.completadasSlugs);
            updateProgressUI();
            renderCurriculum();
            renderCurrentCapsule();
          }
        } else {
          console.warn('No se pudo guardar el progreso en el servidor. Código:', res.status);
        }
      }
    } catch (err) {
      console.warn('Error al guardar progreso:', err);
    } finally {
      state.isSaving = false;
    }
  }

  /**
   * Actualiza la barra y el porcentaje de progreso en tiempo real
   */
  function updateProgressUI() {
    const total = state.route.microcapsulas.length;
    let completedCount = 0;
    for (const c of state.route.microcapsulas) {
      if (state.completedSlugs.has(c.slug)) {
        completedCount++;
      }
    }

    const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    const progText = document.getElementById('progress-text');
    const progBar = document.getElementById('progress-bar');

    if (progText) {
      progText.textContent = `${pct}% Completado (${completedCount} de ${total})`;
    }
    if (progBar) {
      progBar.style.width = `${pct}%`;
      progBar.setAttribute('aria-valuenow', pct.toString());
    }
  }

  /**
   * Renderiza la lista de microcápsulas en el menú lateral
   */
  function renderCurriculum() {
    const container = document.getElementById('curriculum-list');
    if (!container) return;

    container.innerHTML = state.route.microcapsulas
      .map((c, idx) => {
        const isCurrent = idx === state.currentIndex;
        const isDone = state.completedSlugs.has(c.slug);

        let cardClass = 'bg-slate-900/90 border-slate-800 text-slate-300';
        let badgeIcon = `${idx + 1}`;
        let statusBadge = '<span class="text-[11px] text-slate-500 font-semibold">Pendiente</span>';

        if (isDone) {
          cardClass = 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200';
          badgeIcon = '✓';
          statusBadge = '<span class="text-[11px] text-emerald-400 font-bold flex items-center gap-1">✓ Listo</span>';
        }

        if (isCurrent) {
          cardClass = 'bg-cyan-950/40 border-cyan-400/80 text-white font-bold glow-border-blue';
          badgeIcon = '▶';
          statusBadge = '<span class="text-[11px] text-cyan-300 font-bold animate-pulse">▶ En curso</span>';
        }

        const iconBg = isCurrent
          ? 'bg-cyan-400 text-slate-950 font-black'
          : isDone
          ? 'bg-emerald-400 text-slate-950 font-black'
          : 'bg-slate-800 text-slate-400 font-bold';

        return `
          <button
            type="button"
            onclick="window.lmsPlayer.loadCapsule(${idx})"
            class="w-full p-3.5 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all hover:border-cyan-400 ${cardClass} focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            aria-current="${isCurrent ? 'true' : 'false'}"
          >
            <div class="flex items-center gap-3">
              <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${iconBg}">
                ${badgeIcon}
              </span>
              <div>
                <span class="text-xs sm:text-sm ${isCurrent ? 'text-white font-bold' : 'text-slate-300'} block line-clamp-2">
                  ${c.titulo}
                </span>
                <span class="text-[11px] text-slate-400 mt-0.5 block">
                  ${c.duracion} • Paso a paso
                </span>
              </div>
            </div>
            <div class="shrink-0 ml-2">
              ${statusBadge}
            </div>
          </button>
        `;
      })
      .join('');
  }

  /**
   * Navegación a la siguiente microcápsula
   */
  function nextCapsule() {
    if (state.currentIndex < state.route.microcapsulas.length - 1) {
      loadCapsule(state.currentIndex + 1);
    } else {
      showToast('🌟 ¡Felicitaciones! Ha completado todas las cápsulas de esta ruta formativa.');
    }
  }

  /**
   * Navegación a la microcápsula anterior
   */
  function prevCapsule() {
    if (state.currentIndex > 0) {
      loadCapsule(state.currentIndex - 1);
    }
  }

  /**
   * Toast accesible para notificaciones
   */
  function showToast(message) {
    let toast = document.getElementById('lms-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'lms-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.className =
        'fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl bg-emerald-950 border-2 border-emerald-400 text-white font-semibold text-sm shadow-2xl flex items-center gap-3 transition-opacity duration-300';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>🎉</span> <span>${message}</span>`;
    toast.style.opacity = '1';
    toast.style.display = 'flex';

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 300);
    }, 4000);
  }

  /**
   * Abre el modal «Tengo una Duda» prellenando el contexto de la cápsula
   * Si el estudiante tiene Ruta Abierta, abre el modal informativo invitando a Inscripción Completa.
   */
  function openDudaModal() {
    if (!state.isEnrolledFull) {
      const upgradeModal = document.getElementById('duda-upgrade-modal');
      if (upgradeModal) {
        upgradeModal.classList.remove('hidden');
        const cancelBtn = document.getElementById('duda-upgrade-cancel-btn');
        if (cancelBtn) cancelBtn.focus();
        showToast('Las consultas formativas con el tutor requieren Inscripción Completa.');
        return;
      }
      showToast('Las consultas formativas con el tutor requieren Inscripción Completa.');
      return;
    }

    const modal = document.getElementById('duda-modal');
    if (!modal) return;

    const capsule = getCurrentCapsule();
    if (capsule) {
      const modalCapsuleTitle = document.getElementById('duda-modal-capsule-title');
      if (modalCapsuleTitle) modalCapsuleTitle.textContent = capsule.titulo;
      const modalCapsuleSlug = document.getElementById('duda-capsule-slug');
      if (modalCapsuleSlug) modalCapsuleSlug.value = capsule.slug;
    }

    const feedback = document.getElementById('duda-feedback');
    if (feedback) {
      feedback.className = 'hidden';
      feedback.innerHTML = '';
    }

    modal.classList.remove('hidden');

    const textarea = document.getElementById('duda-mensaje');
    if (textarea) {
      setTimeout(() => textarea.focus(), 60);
    }
  }

  /**
   * Cierra el modal «Tengo una Duda» o el modal de mejora
   */
  function closeDudaModal() {
    const modal = document.getElementById('duda-modal');
    if (modal) modal.classList.add('hidden');

    const upgradeModal = document.getElementById('duda-upgrade-modal');
    if (upgradeModal) upgradeModal.classList.add('hidden');

    const dudaBtn = document.getElementById('doubt-btn');
    if (dudaBtn) {
      dudaBtn.focus();
    }
  }

  /**
   * Configura listeners para el modal y formulario de consultas al tutor
   */
  function setupDudaModal() {
    const dudaBtn = document.getElementById('doubt-btn');
    if (dudaBtn) {
      dudaBtn.addEventListener('click', openDudaModal);
    }

    const closeBtn = document.getElementById('modal-close-btn') || document.getElementById('duda-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeDudaModal);
    }

    const cancelBtn = document.getElementById('duda-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeDudaModal);
    }

    const upgradeCloseBtn = document.getElementById('duda-upgrade-close-btn');
    if (upgradeCloseBtn) {
      upgradeCloseBtn.addEventListener('click', closeDudaModal);
    }

    const upgradeCancelBtn = document.getElementById('duda-upgrade-cancel-btn');
    if (upgradeCancelBtn) {
      upgradeCancelBtn.addEventListener('click', closeDudaModal);
    }

    const modal = document.getElementById('duda-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeDudaModal();
        }
      });
    }

    const upgradeModal = document.getElementById('duda-upgrade-modal');
    if (upgradeModal) {
      upgradeModal.addEventListener('click', (e) => {
        if (e.target === upgradeModal) {
          closeDudaModal();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (modal && !modal.classList.contains('hidden')) {
          closeDudaModal();
        }
        if (upgradeModal && !upgradeModal.classList.contains('hidden')) {
          closeDudaModal();
        }
      }
    });

    const form = document.getElementById('duda-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = document.getElementById('duda-mensaje');
        const slugInput = document.getElementById('duda-capsule-slug');
        const feedback = document.getElementById('duda-feedback');
        const submitBtn = document.getElementById('duda-submit-btn');
        const submitText = document.getElementById('duda-submit-text');

        const mensaje = textarea?.value?.trim();
        const microcapsulaSlug = slugInput?.value?.trim() || getCurrentCapsule()?.slug;

        if (!mensaje) {
          if (feedback) {
            feedback.className = 'p-4 rounded-xl bg-red-950/80 border border-red-500 text-red-200 text-sm font-medium';
            feedback.innerHTML = '⚠️ Por favor, escriba su duda antes de enviarla.';
          }
          if (textarea) textarea.focus();
          return;
        }

        if (submitBtn) submitBtn.disabled = true;
        if (submitText) submitText.textContent = 'Enviando mi duda al tutor...';
        if (feedback) {
          feedback.className = 'hidden';
          feedback.innerHTML = '';
        }

        try {
          const res = await fetch('/api/consultas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              microcapsulaSlug,
              mensaje,
            }),
          });

          const data = await res.json();

          if (res.ok && data.success) {
            if (feedback) {
              feedback.className = 'p-5 rounded-2xl bg-emerald-950/90 border-2 border-emerald-400 text-white text-sm sm:text-base leading-relaxed';
              feedback.innerHTML = `
                <div class="flex items-start gap-3">
                  <span class="text-3xl">🎉</span>
                  <div>
                    <strong class="text-emerald-300 block text-base sm:text-lg mb-1 font-bold">¡Listo! Tu duda ha sido recibida por tu tutor de LDDIGITALCO.</strong>
                    <p class="text-slate-200">Te responderemos muy pronto a tu correo.</p>
                  </div>
                </div>
              `;
            }
            if (form) form.reset();
            showToast('¡Listo! Tu duda ha sido recibida por tu tutor de LDDIGITALCO.');
          } else if (res.status === 403 || data.error === 'requires_inscripcion_completa') {
            if (feedback) {
              feedback.className = 'p-5 rounded-2xl bg-amber-950/90 border-2 border-amber-400 text-white text-sm sm:text-base leading-relaxed';
              feedback.innerHTML = `
                <div class="flex items-start gap-3">
                  <span class="text-3xl">🔒</span>
                  <div>
                    <strong class="text-amber-300 block text-base font-bold mb-1">Inscripción Completa Requerida</strong>
                    <p class="text-slate-200 mb-3">${data.message || 'El envío de consultas formativas directas al tutor requiere Inscripción Completa.'}</p>
                    <a href="https://wa.me/573000000000?text=Hola,%20quisiera%20solicitar%20la%20Inscripción%20Completa%20para%20consultas%20con%20tutor." target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs">
                      <span>💬</span> Solicitar Inscripción Completa
                    </a>
                  </div>
                </div>
              `;
            }
            showToast('El envío de consultas al tutor requiere Inscripción Completa.');
          } else {
            if (feedback) {
              feedback.className = 'p-4 rounded-xl bg-amber-950/80 border border-amber-500 text-amber-200 text-sm font-medium';
              feedback.innerHTML = `⚠️ ${data.error || 'No se pudo enviar su duda. Por favor, intente nuevamente.'}`;
            }
          }
        } catch (err) {
          if (feedback) {
            feedback.className = 'p-4 rounded-xl bg-red-950/80 border border-red-500 text-red-200 text-sm font-medium';
            feedback.innerHTML = '⚠️ Ocurrió un error de conexión al enviar su duda. Verifique su internet e intente nuevamente.';
          }
        } finally {
          if (submitBtn) submitBtn.disabled = false;
          if (submitText) submitText.textContent = 'Enviar mi Duda al Tutor';
        }
      });
    }
  }

  /**
   * Asignación de event listeners en elementos interactivos
   */
  function setupEventListeners() {
    const prevBtn = document.getElementById('prev-lesson-btn');
    if (prevBtn) prevBtn.addEventListener('click', prevCapsule);

    const nextBtn = document.getElementById('next-lesson-btn');
    if (nextBtn) nextBtn.addEventListener('click', nextCapsule);

    const toggleBtn = document.getElementById('toggle-complete-btn');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleComplete);

    // Escuchar sincronización exitosa en segundo plano
    window.addEventListener('lms:sync-completed', function (e) {
      if (e.detail && Array.isArray(e.detail.slugs)) {
        e.detail.slugs.forEach(function (slug) {
          state.completedSlugs.add(slug);
        });
        updateProgressUI();
        renderCurriculum();
        renderCurrentCapsule();
      }
    });

    setupDudaModal();
  }

  // Exponer API pública en window para interacción
  window.lmsPlayer = {
    init,
    loadCapsule,
    nextCapsule,
    prevCapsule,
    toggleComplete,
    handleVideoEnded,
    openDudaModal,
    closeDudaModal,
    getState: () => ({ ...state }),
  };

  // Inicializar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
