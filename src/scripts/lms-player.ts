// LDDIGITALCO — Controlador de Aula y Reproductor de Microcápsulas
// Módulo TypeScript compilado por Astro/Vite que conecta PlayerController y VideoPlayerAdapter

import { PlayerController, type ProgressUpdatePayload } from '../lib/courses/player-controller';
import { YouTubeIframeAdapter, type VideoPlayerAdapter } from '../lib/courses/video-player-adapter';
import { saveProgressWithOfflineSync, initBrowserOfflineSync } from '../lib/offline/sync-manager';
import type { Microcapsula, RutaAprendizaje } from '../lib/courses/types';

document.addEventListener('DOMContentLoaded', () => {
  initPlayerApp();
});

function initPlayerApp() {
  initBrowserOfflineSync();

  const dataEl = document.getElementById('lms-initial-data');
  if (!dataEl) return;

  let initialData: any = {};
  try {
    initialData = JSON.parse(dataEl.textContent || '{}');
  } catch (err) {
    console.error('Error parseando lms-initial-data:', err);
    return;
  }

  const route: RutaAprendizaje = initialData.route;
  if (!route || !route.microcapsulas || route.microcapsulas.length === 0) return;

  const initialCompletedSlugs: string[] = initialData.completedSlugs || [];
  const isEnrolledFull: boolean = Boolean(
    initialData.isEnrolledFull ||
    initialData.student?.nivel_acceso === 'inscripcion_completa' ||
    initialData.student?.rol === 'admin' ||
    initialData.student?.rol === 'tutor'
  );

  // Determinar cápsula inicial (por query param o primera no completada)
  const urlParams = new URLSearchParams(window.location.search);
  const requestedCapsuleSlug = urlParams.get('capsula');
  let initialIdx = 0;

  if (requestedCapsuleSlug) {
    const foundIdx = route.microcapsulas.findIndex((c) => c.slug === requestedCapsuleSlug);
    if (foundIdx !== -1) initialIdx = foundIdx;
  } else {
    const firstIncompleteIdx = route.microcapsulas.findIndex(
      (c) => !initialCompletedSlugs.includes(c.slug)
    );
    if (firstIncompleteIdx !== -1) initialIdx = firstIncompleteIdx;
  }

  // DOM Elements
  const lessonTitleEl = document.getElementById('lesson-title');
  const lessonDurationEl = document.getElementById('lesson-duration');
  const lessonSummaryEl = document.getElementById('lesson-summary');
  const completionBadge = document.getElementById('completion-badge');
  const toggleCompleteBtn = document.getElementById('toggle-complete-btn');
  const toggleCompleteText = document.getElementById('toggle-complete-text');
  const nextLessonBtn = document.getElementById('next-lesson-btn');
  const prevLessonBtn = document.getElementById('prev-lesson-btn');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const curriculumList = document.getElementById('curriculum-list');

  // Modal Duda Elements
  const doubtBtn = document.getElementById('doubt-btn');
  const dudaModal = document.getElementById('duda-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const dudaForm = document.getElementById('duda-form');
  const dudaMicrocapsulaSpan = document.getElementById('duda-microcapsula-titulo');
  const dudaStatus = document.getElementById('duda-status');
  const upgradeNotice = document.getElementById('duda-upgrade-notice');

  // Video Engine Adapter Seam
  const videoAdapter: VideoPlayerAdapter = new YouTubeIframeAdapter();

  // Deep Domain Controller
  const controller = new PlayerController({
    route,
    initialCompletedSlugs,
    initialCapsuleIndex: initialIdx,
    saveProgressFn: async (capsuleSlug, completed) => {
      await saveProgressWithOfflineSync(capsuleSlug, completed, route.slug);
    },
    onCapsuleChange: (capsule: Microcapsula, index: number, isCompleted: boolean) => {
      updateCapsuleDisplay(capsule, index, isCompleted);
      videoAdapter.loadVideo(capsule.youtubeId);
    },
    onProgressUpdate: (stats: ProgressUpdatePayload) => {
      updateProgressDisplay(stats);
    },
    onAllCompleted: () => {
      showCompletionCelebration();
    },
  });

  function updateCapsuleDisplay(capsule: Microcapsula, index: number, isCompleted: boolean) {
    if (lessonTitleEl) lessonTitleEl.textContent = capsule.titulo;
    if (lessonDurationEl) {
      lessonDurationEl.textContent = `Duración: ${capsule.duracion} • Explicado paso a paso`;
    }
    if (lessonSummaryEl) lessonSummaryEl.textContent = capsule.resumen;

    if (completionBadge) {
      if (isCompleted) {
        completionBadge.classList.remove('hidden');
      } else {
        completionBadge.classList.add('hidden');
      }
    }

    if (toggleCompleteBtn && toggleCompleteText) {
      toggleCompleteBtn.setAttribute('aria-pressed', isCompleted ? 'true' : 'false');
      toggleCompleteText.textContent = isCompleted
        ? '✓ Completada (clic para desmarcar)'
        : '○ Marcar como completada';
    }

    if (prevLessonBtn) {
      if (index === 0) {
        prevLessonBtn.setAttribute('disabled', 'true');
        prevLessonBtn.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        prevLessonBtn.removeAttribute('disabled');
        prevLessonBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }

    if (nextLessonBtn) {
      const isLast = index >= route.microcapsulas.length - 1;
      nextLessonBtn.innerHTML = isLast
        ? '<span>🎉</span><span>¡Ruta Finalizada!</span>'
        : '<span>Siguiente Microcápsula</span><span>→</span>';
    }

    // Actualizar clase activa en el listado lateral
    if (curriculumList) {
      const items = curriculumList.querySelectorAll('[data-capsule-index]');
      items.forEach((item) => {
        const itemIdx = parseInt(item.getAttribute('data-capsule-index') || '-1', 10);
        if (itemIdx === index) {
          item.classList.add('border-cyan-400', 'bg-cyan-950/20');
          item.classList.remove('border-slate-800');
        } else {
          item.classList.remove('border-cyan-400', 'bg-cyan-950/20');
          item.classList.add('border-slate-800');
        }
      });
    }

    // Actualizar URL sin recargar
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('capsula', capsule.slug);
    window.history.replaceState({}, '', newUrl.toString());
  }

  function updateProgressDisplay(stats: ProgressUpdatePayload) {
    if (progressBar) {
      progressBar.style.width = `${stats.porcentaje}%`;
      progressBar.parentElement?.setAttribute('aria-valuenow', String(stats.porcentaje));
    }
    if (progressText) {
      progressText.textContent = `${stats.porcentaje}% Completado (${stats.completadas} de ${stats.total})`;
    }

    // Actualizar checks en el curriculum lateral
    if (curriculumList) {
      route.microcapsulas.forEach((cap, idx) => {
        const item = curriculumList.querySelector(`[data-capsule-index="${idx}"]`);
        const statusSpan = item?.querySelector('.capsule-status-badge');
        if (statusSpan) {
          const isDone = stats.completedSlugs.includes(cap.slug);
          if (isDone) {
            statusSpan.className = 'capsule-status-badge text-[10px] font-bold text-emerald-400';
            statusSpan.textContent = '✓ Lista';
          } else {
            statusSpan.className = 'capsule-status-badge text-[10px] font-bold text-slate-400';
            statusSpan.textContent = 'Pendiente';
          }
        }
      });
    }
  }

  function showCompletionCelebration() {
    if (completionBadge) {
      completionBadge.classList.add('animate-bounce');
      setTimeout(() => completionBadge.classList.remove('animate-bounce'), 3000);
    }
  }

  // Inicializar reproductor de video
  const activeCapsule = controller.getCurrentCapsule();
  if (activeCapsule) {
    videoAdapter.mount('youtube-iframe', activeCapsule.youtubeId, () => {
      // Player ready
    });
    videoAdapter.onEnded(() => {
      controller.handlePlayerEnded();
    });
    updateCapsuleDisplay(activeCapsule, controller.getCurrentIndex(), controller.isCurrentCapsuleCompleted());
  }

  // Event Listeners de navegación
  if (nextLessonBtn) {
    nextLessonBtn.addEventListener('click', () => {
      controller.nextCapsule();
    });
  }

  if (prevLessonBtn) {
    prevLessonBtn.addEventListener('click', () => {
      controller.prevCapsule();
    });
  }

  if (toggleCompleteBtn) {
    toggleCompleteBtn.addEventListener('click', async () => {
      await controller.toggleComplete();
    });
  }

  if (curriculumList) {
    curriculumList.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-capsule-index]');
      if (!target) return;
      const index = parseInt(target.getAttribute('data-capsule-index') || '0', 10);
      controller.goToCapsule(index);
    });
  }

  // Modal «Tengo una Duda»
  if (doubtBtn && dudaModal) {
    doubtBtn.addEventListener('click', () => {
      if (!isEnrolledFull) {
        if (upgradeNotice) upgradeNotice.classList.remove('hidden');
        if (dudaForm) (dudaForm as HTMLElement).style.display = 'none';
      } else {
        if (upgradeNotice) upgradeNotice.classList.add('hidden');
        if (dudaForm) (dudaForm as HTMLElement).style.display = 'block';
      }

      const cur = controller.getCurrentCapsule();
      if (dudaMicrocapsulaSpan && cur) {
        dudaMicrocapsulaSpan.textContent = cur.titulo;
      }
      dudaModal.classList.remove('hidden');
    });

    const closeModal = () => {
      dudaModal.classList.add('hidden');
      if (dudaStatus) dudaStatus.className = 'hidden';
    };

    modalCloseBtn?.addEventListener('click', closeModal);
    modalCancelBtn?.addEventListener('click', closeModal);

    dudaForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const textarea = document.getElementById('duda-texto') as HTMLTextAreaElement;
      const mensaje = textarea?.value.trim();
      const cur = controller.getCurrentCapsule();

      if (!mensaje || !cur) return;

      if (dudaStatus) {
        dudaStatus.className = 'p-3 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 block';
        dudaStatus.textContent = 'Enviando su duda al tutor pedagógico...';
      }

      try {
        const res = await fetch('/api/consultas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            microcapsulaSlug: cur.slug,
            mensaje,
          }),
        });
        const data = await res.json();
        if (data.success) {
          if (dudaStatus) {
            dudaStatus.className = 'p-4 rounded-xl text-sm font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 block';
            dudaStatus.innerHTML = '¡Listo! Su duda ha sido recibida con éxito por el tutor de LDDIGITALCO.<br><span class="text-xs text-slate-300 font-normal">Le responderemos directamente a su correo muy pronto.</span>';
          }
          if (textarea) textarea.value = '';
          setTimeout(closeModal, 3000);
        } else {
          throw new Error(data.message || data.error || 'No se pudo enviar la duda.');
        }
      } catch (err: any) {
        if (dudaStatus) {
          dudaStatus.className = 'p-3 rounded-xl text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-500/50 block';
          dudaStatus.textContent = `Error: ${err.message}`;
        }
      }
    });
  }
}
