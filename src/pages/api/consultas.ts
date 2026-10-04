// LDDIGITALCO — Adaptador HTTP: Envío de Consultas Formativas
// Mantiene una interfaz delgada delegando las reglas pedagógicas y de notificación a ConsultaFormativaService

import type { APIRoute } from 'astro';
import { getAuthServiceFromContext } from '../../lib/auth';
import {
  getConsultaFormativaServiceFromContext,
  ConsultaAccesoDenegadoError,
  ConsultaValidacionError,
} from '../../lib/consultas';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const authService = getAuthServiceFromContext(context);
  const session = await authService.getSessionFromRequest(request);

  if (!session) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'No autorizado. Debe iniciar sesión para enviar una consulta al tutor.',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Cuerpo de solicitud JSON no válido.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const service = getConsultaFormativaServiceFromContext(context);

  try {
    const result = await service.enviarConsulta({
      student: session,
      microcapsulaSlug: body?.microcapsulaSlug,
      mensaje: body?.mensaje,
    });

    return new Response(
      JSON.stringify({
        success: true,
        consultaId: result.consultaId,
        mensaje: result.mensaje,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    if (err instanceof ConsultaAccesoDenegadoError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err.code,
          message: err.message,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (err instanceof ConsultaValidacionError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err.message,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Error interno del servidor.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
