// LDDIGITALCO — Adaptador HTTP: Estado de Consultas Formativas (Admin / Tutor)
// Delega la mutación de estado a ConsultaFormativaService

import type { APIRoute } from 'astro';
import { getAuthServiceFromContext, getEnvFromContext } from '../../../../lib/auth';
import {
  getConsultaFormativaServiceFromContext,
  ConsultaValidacionError,
  ConsultaNoEncontradaError,
} from '../../../../lib/consultas';

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

  const { consultaId, estado } = body || {};
  const service = getConsultaFormativaServiceFromContext(context);

  try {
    const updated = await service.cambiarEstado(consultaId, estado);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Consulta formativa marcada como '${updated.estado}'.`,
        consultaId: updated.id,
        estado: updated.estado,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    if (err instanceof ConsultaValidacionError) {
      return new Response(
        JSON.stringify({ success: false, error: err.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (err instanceof ConsultaNoEncontradaError) {
      return new Response(
        JSON.stringify({ success: false, error: err.message }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Error interno del servidor.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
