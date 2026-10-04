// LDDIGITALCO — Adaptador HTTP: Progreso Formativo
// Interfaz delgada que delega el cálculo, persistencia y control de acceso a ProgresoFormativo

import type { APIRoute } from 'astro';
import { getAuthServiceFromContext } from '../../lib/auth';
import {
  getProgresoFormativoFromContext,
  ProgresoAccesoDenegadoError,
  ProgresoRutaNoEncontradaError,
  ProgresoValidacionError,
} from '../../lib/courses/progreso-formativo';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { request, url } = context;
  const authService = getAuthServiceFromContext(context);
  const session = await authService.getSessionFromRequest(request);

  if (!session) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'No autorizado. Debe iniciar sesión para consultar el progreso formativo.',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const rutaSlug = url.searchParams.get('ruta') || 'ciberseguridad-whatsapp';
  const progresoService = getProgresoFormativoFromContext(context);

  try {
    const summary = await progresoService.consultarProgreso(session, rutaSlug);
    return new Response(
      JSON.stringify({
        success: true,
        ...summary,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    if (err instanceof ProgresoAccesoDenegadoError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err.code,
          message: err.message,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (err instanceof ProgresoRutaNoEncontradaError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err.message,
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
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

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const authService = getAuthServiceFromContext(context);
  const session = await authService.getSessionFromRequest(request);

  if (!session) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'No autorizado. Debe iniciar sesión para actualizar su progreso.',
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

  const progresoService = getProgresoFormativoFromContext(context);

  try {
    const result = await progresoService.registrarCompletitud(session, body || {});
    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    if (err instanceof ProgresoAccesoDenegadoError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err.code,
          message: err.message,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (err instanceof ProgresoValidacionError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err.message,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (err instanceof ProgresoRutaNoEncontradaError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err.message,
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
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
