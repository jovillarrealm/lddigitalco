import type { APIRoute } from 'astro';
import { getAuthServiceFromContext, getDbFromContext } from '../../lib/auth';
import { getStudentById } from '../../lib/db/estudiantes';
import { getUpcomingLiveSession } from '../../lib/courses/live-session';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { request } = context;
  const authService = getAuthServiceFromContext(context);
  const session = await authService.getSessionFromRequest(request);

  const sessionInfo = getUpcomingLiveSession();

  let tier: 'ruta_abierta' | 'inscripcion_completa' | 'invitado' = 'invitado';
  let canAccess = false;

  if (session) {
    const db = getDbFromContext(context);
    const freshStudent = await getStudentById(db, session.id);
    tier = (freshStudent?.nivel_acceso || session.nivel_acceso) as any;

    if (tier === 'inscripcion_completa' || session.rol === 'admin' || session.rol === 'tutor') {
      canAccess = true;
    }
  }

  const upgradePrompt = !canAccess
    ? {
        title: 'Talleres en Directo con tu Tutor',
        message:
          'Pase a la Inscripción Completa para desbloquear los talleres grupales en vivo con su tutor y recibir acompañamiento personalizado paso a paso.',
        actionText: 'Solicitar Inscripción Completa',
        contactUrl:
          'https://wa.me/573000000000?text=Hola,%20deseo%20dar%20el%20paso%20a%20la%20Inscripción%20Completa%20en%20LDDIGITALCO.',
      }
    : null;

  return new Response(
    JSON.stringify({
      success: true,
      session: {
        id: sessionInfo.session.id,
        title: sessionInfo.session.title,
        description: sessionInfo.session.description,
        scheduledAt: sessionInfo.session.scheduledAt,
        durationMinutes: sessionInfo.session.durationMinutes,
        nextScheduledAt: sessionInfo.session.nextScheduledAt,
      },
      status: sessionInfo.status,
      canJoin: sessionInfo.canJoin,
      startsInMinutes: sessionInfo.startsInMinutes,
      formattedTime: sessionInfo.formattedTime,
      startsInDisplay: sessionInfo.startsInDisplay,
      timeRemainingMessage: sessionInfo.timeRemainingMessage,
      activeUntil: sessionInfo.activeUntil,
      tier,
      canAccess,
      meetUrl: canAccess ? sessionInfo.session.meetUrl : null,
      upgradePrompt,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
