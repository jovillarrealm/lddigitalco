// LDDIGITALCO — Servicio de Sesión en Vivo (Taller Grupal de Acompañamiento)
// Cumple con GLOSSARY.md y GUIA_DE_ESTILO.md (Control Escalonado y WCAG AAA)

export type LiveSessionStatusType = 'upcoming' | 'active' | 'completed';

export interface LiveSession {
  id: string;
  title: string;
  description: string;
  scheduledAt: string; // ISO 8601 string
  durationMinutes: number; // Por defecto 60 min
  meetUrl: string; // URL de Zoom / Google Meet
  nextScheduledAt?: string; // Próxima fecha programada
}

export interface LiveSessionInfo {
  session: LiveSession;
  status: LiveSessionStatusType;
  startsInMinutes: number;
  canJoin: boolean;
  timeRemainingMessage: string;
  activeUntil: string;
  formattedTime: string;
  startsInDisplay: string;
}

export const DEFAULT_LIVE_SESSION: LiveSession = {
  id: 'sesion-semanal-miercoles',
  title: 'Taller en Directo: Práctica de Celular y Dudas en Vivo',
  description: 'Conéctese con sus tutores para practicar juntos y resolver dudas en tiempo real.',
  scheduledAt: '2026-10-07T18:00:00.000Z',
  durationMinutes: 60,
  meetUrl: 'https://meet.google.com/lddigitalco-clase-en-vivo',
  nextScheduledAt: '2026-10-14T18:00:00.000Z',
};

const SPANISH_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Formatea humanamente la fecha y hora de la sesión (ej. "Hoy 18:00" o "Viernes, 24 de Octubre - 18:00").
 * Evita mostrar cantidades grandes y crudas de minutos cuando faltan días.
 */
export function formatLiveSessionTime(
  scheduledAtIso: string,
  referenceTime: Date = new Date()
): string {
  const date = new Date(scheduledAtIso);
  const ref = new Date(referenceTime);

  const isSameDay =
    date.getUTCFullYear() === ref.getUTCFullYear() &&
    date.getUTCMonth() === ref.getUTCMonth() &&
    date.getUTCDate() === ref.getUTCDate();

  const tomorrow = new Date(ref.getTime() + 24 * 60 * 60 * 1000);
  const isTomorrow =
    date.getUTCFullYear() === tomorrow.getUTCFullYear() &&
    date.getUTCMonth() === tomorrow.getUTCMonth() &&
    date.getUTCDate() === tomorrow.getUTCDate();

  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isSameDay) {
    return `Hoy ${timeStr}`;
  }
  if (isTomorrow) {
    return `Mañana ${timeStr}`;
  }

  const dayName = SPANISH_DAYS[date.getUTCDay()];
  const dayNum = date.getUTCDate();
  const monthName = SPANISH_MONTHS[date.getUTCMonth()];

  return `${dayName}, ${dayNum} de ${monthName} - ${timeStr}`;
}

/**
 * Retorna el texto amigable para mostrar en el pill/banner de estado:
 * - Si falta 60 minutos o menos: "Inicia en X min"
 * - Si faltan días o más de 60 minutos: Fecha formateada amigablemente (ej. "Viernes, 24 de Octubre - 18:00")
 */
export function formatStartsIn(
  startsInMinutes: number,
  scheduledAtIso: string,
  referenceTime: Date = new Date()
): string {
  if (startsInMinutes <= 0) {
    return '● En Vivo Ahora';
  }
  if (startsInMinutes <= 60) {
    return `Inicia en ${startsInMinutes} min`;
  }
  return formatLiveSessionTime(scheduledAtIso, referenceTime);
}

/**
 * Calcula el estado de una sesión en vivo respecto a un instante de referencia.
 * Reglas de negocio:
 * - upcoming (> 15 min antes): Botón deshabilitado con aviso de que se activa 15 min antes.
 * - active (entre 15 min antes de scheduledAt y final de la clase scheduledAt + duration): Botón activo en 1 clic.
 * - completed (> duración de clase después): Muestra aviso de sesión finalizada y fecha de la siguiente.
 */
export function getLiveSessionStatus(
  session: LiveSession,
  referenceTime: Date = new Date()
): LiveSessionInfo {
  const scheduledTime = new Date(session.scheduledAt).getTime();
  const durationMs = (session.durationMinutes || 60) * 60 * 1000;
  const classEndTime = scheduledTime + durationMs;
  const activationTime = scheduledTime - 15 * 60 * 1000; // 15 minutos antes
  const now = referenceTime.getTime();

  const activeUntil = new Date(classEndTime).toISOString();
  const formattedTime = formatLiveSessionTime(session.scheduledAt, referenceTime);

  if (now < activationTime) {
    const startsInMinutes = Math.max(1, Math.ceil((scheduledTime - now) / (60 * 1000)));
    const startsInDisplay = formatStartsIn(startsInMinutes, session.scheduledAt, referenceTime);
    const timeRemainingMessage =
      startsInMinutes <= 60
        ? `El botón de ingreso se activará automáticamente 15 minutos antes de la clase (inicia en aprox. ${startsInMinutes} minutos).`
        : `El botón de ingreso se activará automáticamente 15 minutos antes de la clase (${formattedTime}).`;

    return {
      session,
      status: 'upcoming',
      startsInMinutes,
      canJoin: false,
      timeRemainingMessage,
      activeUntil,
      formattedTime,
      startsInDisplay,
    };
  }

  if (now <= classEndTime) {
    const minutesLeft = Math.max(0, Math.ceil((classEndTime - now) / (60 * 1000)));
    return {
      session,
      status: 'active',
      startsInMinutes: 0,
      canJoin: true,
      timeRemainingMessage: `¡La clase está activa en este momento! (Finaliza en aprox. ${minutesLeft} minutos).`,
      activeUntil,
      formattedTime,
      startsInDisplay: '● En Vivo Ahora',
    };
  }

  const nextFormatted = session.nextScheduledAt
    ? formatLiveSessionTime(session.nextScheduledAt, referenceTime)
    : 'próxima semana';

  return {
    session,
    status: 'completed',
    startsInMinutes: -1,
    canJoin: false,
    timeRemainingMessage: `Este taller en directo ha finalizado. La próxima sesión en vivo está programada para: ${nextFormatted}.`,
    activeUntil,
    formattedTime,
    startsInDisplay: 'Finalizada',
  };
}

/**
 * Retorna la información de la sesión en vivo configurada o por defecto
 */
export function getUpcomingLiveSession(
  referenceTime: Date = new Date(),
  customSession?: Partial<LiveSession>
): LiveSessionInfo {
  const session: LiveSession = {
    ...DEFAULT_LIVE_SESSION,
    ...customSession,
  };
  return getLiveSessionStatus(session, referenceTime);
}
