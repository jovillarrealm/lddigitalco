// LDDIGITALCO — LMS Student Portal Logic

const COURSE_LESSONS = [
  {
    id: 1,
    title: "Cápsula #1: Cómo configurar tu celular para no cansar la vista",
    duration: "02:15",
    summary: "Aprende a aumentar el tamaño de letra, ajustar el brillo automático y activar el filtro de luz nocturna para leer sin fatiga visual.",
    completed: true
  },
  {
    id: 2,
    title: "Cápsula #2: Cómo enviar notas de voz y fotos por WhatsApp a tu familia",
    duration: "02:40",
    summary: "Guía paso a paso para mandar audios manteniendo presionado el micrófono o bloqueándolo hacia arriba, y cómo compartir fotos con nitidez.",
    completed: true
  },
  {
    id: 3,
    title: "Cápsula #3: Cómo identificar un mensaje o enlace de estafa en WhatsApp",
    duration: "02:45",
    summary: "Recuerda la regla de oro: Ningún banco o entidad solicita contraseñas por WhatsApp. Si un mensaje genera urgencia extrema, no abras el enlace.",
    completed: false
  },
  {
    id: 4,
    title: "Cápsula #4: Cómo pedirle recetas, trámites e información a la IA con tu voz",
    duration: "03:10",
    summary: "Aprende a usar los asistentes de inteligencia artificial como un acompañante diario: dile lo que necesitas y te responderá con claridad.",
    completed: false
  }
];

let currentLessonIndex = 2; // Default on Lesson 3

function initLMS() {
  renderLesson(currentLessonIndex);
  updateCurriculumUI();
}

function renderLesson(index) {
  currentLessonIndex = index;
  const lesson = COURSE_LESSONS[index];
  if (!lesson) return;

  const titleEl = document.getElementById('lesson-title');
  const durEl = document.getElementById('lesson-duration');
  const sumEl = document.getElementById('lesson-summary');

  if (titleEl) titleEl.innerText = lesson.title;
  if (durEl) durEl.innerText = `Duración: ${lesson.duration} • Explicado paso a paso`;
  if (sumEl) sumEl.innerText = lesson.summary;

  updateCurriculumUI();
}

function nextLesson() {
  if (currentLessonIndex < COURSE_LESSONS.length - 1) {
    COURSE_LESSONS[currentLessonIndex].completed = true;
    renderLesson(currentLessonIndex + 1);
  } else {
    showToast('¡Felicitaciones! Has completado todas las cápsulas de este módulo.');
  }
}

function prevLesson() {
  if (currentLessonIndex > 0) {
    renderLesson(currentLessonIndex - 1);
  }
}

function updateCurriculumUI() {
  const container = document.getElementById('curriculum-list');
  if (!container) return;

  container.innerHTML = COURSE_LESSONS.map((l, idx) => {
    const isCurrent = idx === currentLessonIndex;
    const isDone = l.completed;

    let badgeClass = 'bg-slate-900 border-slate-800 text-slate-400';
    let icon = `${idx + 1}`;
    let statusText = 'Pendiente';

    if (isDone) {
      badgeClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      icon = '✓';
      statusText = 'Listo';
    } else if (isCurrent) {
      badgeClass = 'bg-cyan-500/15 border-cyan-400 text-cyan-300 font-bold';
      icon = '▶';
      statusText = 'En curso';
    }

    return `
      <div onclick="renderLesson(${idx})" class="p-3 rounded-xl border ${badgeClass} flex items-center justify-between cursor-pointer transition-all hover:border-cyan-400">
        <div class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCurrent ? 'bg-cyan-400 text-black' : (isDone ? 'bg-emerald-400 text-black' : 'bg-slate-800')}">${icon}</span>
          <div>
            <span class="text-xs ${isCurrent ? 'text-white font-bold' : 'text-slate-300'} block">${l.title}</span>
            <span class="text-[10px] text-slate-400">${l.duration}</span>
          </div>
        </div>
        <span class="text-[11px] font-semibold">${statusText}</span>
      </div>
    `;
  }).join('');

  // Update progress bar
  const completedCount = COURSE_LESSONS.filter(l => l.completed).length;
  const pct = Math.round((completedCount / COURSE_LESSONS.length) * 100);
  const progText = document.getElementById('progress-text');
  const progBar = document.getElementById('progress-bar');
  if (progText) progText.innerText = `${pct}% Completado`;
  if (progBar) progBar.style.width = `${pct}%`;
}

document.addEventListener('DOMContentLoaded', initLMS);
