// LDDIGITALCO — Endpoint de Configuración de Sesión en Vivo
// Adaptador HTTP delgado delegando al módulo profundo SesionEnVivoManager

import type { APIRoute } from 'astro';
import { getAuthServiceFromContext, getEnvFromContext } from '../../../lib/auth';
import { getSesionEnVivoManagerFromContext } from '../../../lib/courses/live-session';

export const prerender = false;

function checkAdminAuth(request: Request, env: Record<string, any>, session: any): boolean {
  if (session && session.rol === 'admin') return true;
  const adminKeyHeader = request.headers.get('x-admin-key');
  const expectedKey = env.ADMIN_KEY || 'dev-admin-secret';
  return adminKeyHeader === expectedKey;
}

export const GET: APIRoute = async (context) => {
  const liveManager = getSesionEnVivoManagerFromContext(context);
  const current = await liveManager.getConfiguredSession();
  const status = await liveManager.getSessionStatus();
  return new Response(JSON.stringify({ success: true, session: current, status }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const authService = getAuthServiceFromContext(context);
  const env = getEnvFromContext(context);
  const session = await authService.getSessionFromRequest(request);

  if (!checkAdminAuth(request, env, session)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'No autorizado. Se requiere x-admin-key válida o sesión con rol admin.',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Cuerpo de solicitud inválido.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { title, scheduledAt, meetUrl, durationMinutes, description, nextScheduledAt } = body;

  const updates: any = {};
  if (title && typeof title === 'string') updates.title = title.trim();
  if (description && typeof description === 'string') updates.description = description.trim();
  if (scheduledAt && typeof scheduledAt === 'string') updates.scheduledAt = scheduledAt.trim();
  if (meetUrl && typeof meetUrl === 'string') updates.meetUrl = meetUrl.trim();
  if (durationMinutes && typeof durationMinutes === 'number') updates.durationMinutes = durationMinutes;
  if (nextScheduledAt && typeof nextScheduledAt === 'string') updates.nextScheduledAt = nextScheduledAt.trim();

  const liveManager = getSesionEnVivoManagerFromContext(context);
  const updatedSession = await liveManager.updateSession(updates);
  const liveInfo = await liveManager.getSessionStatus();

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Sesión en vivo actualizada exitosamente.',
      session: updatedSession,
      status: liveInfo,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
