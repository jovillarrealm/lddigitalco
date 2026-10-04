// LDDIGITALCO — Endpoint de Estado de Consultas Formativas
// Permite al Administrador o Tutor marcar dudas como respondidas o pendientes

import type { APIRoute } from 'astro';
import { getAuthServiceFromContext, getDbFromContext, getEnvFromContext } from '../../../../lib/auth';
import { updateConsultaEstado, getConsultaById } from '../../../../lib/db/consultas';

export const prerender = false;

function checkAdminAuth(request: Request, env: Record<string, any>, session: any): boolean {
  if (session && (session.rol === 'admin' || session.rol === 'tutor')) return true;
  const adminKeyHeader = request.headers.get('x-admin-key');
  const expectedKey = env.ADMIN_KEY || 'dev-admin-secret';
  return adminKeyHeader === expectedKey;
}

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const authService = getAuthServiceFromContext(context);
  const env = getEnvFromContext(context);
  const session = await authService.getSessionFromRequest(request);

  if (!checkAdminAuth(request, env, session)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'No autorizado. Se requiere clave de administrador o sesión con rol tutor/admin.',
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

  const { consultaId, estado } = body;
  if (!consultaId || typeof consultaId !== 'string') {
    return new Response(
      JSON.stringify({ success: false, error: 'consultaId es requerido.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (estado !== 'pendiente' && estado !== 'respondida') {
    return new Response(
      JSON.stringify({ success: false, error: "estado debe ser 'pendiente' o 'respondida'." }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const db = getDbFromContext(context);
  const existing = await getConsultaById(db, consultaId);
  if (!existing) {
    return new Response(
      JSON.stringify({ success: false, error: 'Consulta formativa no encontrada.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  await updateConsultaEstado(db, consultaId, estado);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Consulta formativa marcada como '${estado}'.`,
      consultaId,
      estado,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
