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

  if (now < activationTime) {
    const startsInMinutes = Math.max(1, Math.ceil((scheduledTime - now) / (60 * 1000)));
    return {
      session,
      status: 'upcoming',
      startsInMinutes,
      canJoin: false,
      timeRemainingMessage: `El botón de ingreso se activará automáticamente 15 minutos antes de la clase (inicia en aprox. ${startsInMinutes} minutos).`,
      activeUntil,
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
    };
  }

  return {
    session,
    status: 'completed',
    startsInMinutes: -1,
    canJoin: false,
    timeRemainingMessage: `Este taller en directo ha finalizado. La próxima sesión en vivo está programada para: ${session.nextScheduledAt || 'próxima semana'}.`,
    activeUntil,
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
