import type { APIRoute } from 'astro';
import { getAuthServiceFromContext, getDbFromContext } from '../../lib/auth';
import {
  markComplete,
  unmarkComplete,
  getProgressByStudent,
} from '../../lib/db/progreso';
import {
  getRouteBySlug,
  findCapsuleBySlug,
  calculateRouteProgress,
} from '../../lib/courses';

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
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const db = getDbFromContext(context);
  const rutaSlug = url.searchParams.get('ruta') || 'ciberseguridad-whatsapp';
  const route = getRouteBySlug(rutaSlug);

  if (!route) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Ruta de aprendizaje '${rutaSlug}' no encontrada.`,
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const progressRecords = await getProgressByStudent(db, session.id);
  const completedSlugs = progressRecords.map((p) => p.microcapsula_slug);
  const stats = calculateRouteProgress(completedSlugs, route);

  const routeCompletedSlugs = route.microcapsulas
    .filter((c) => completedSlugs.includes(c.slug))
    .map((c) => c.slug);

  return new Response(
    JSON.stringify({
      success: true,
      ruta: route.slug,
      tituloRuta: route.titulo,
      total: stats.total,
      completadas: stats.completadas,
      porcentaje: stats.porcentaje,
      completadasSlugs: routeCompletedSlugs,
      todosCompletados: stats.porcentaje === 100,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
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
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
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
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const { microcapsulaSlug, completado = true, rutaSlug } = body || {};

  if (!microcapsulaSlug || typeof microcapsulaSlug !== 'string' || !microcapsulaSlug.trim()) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'El campo microcapsulaSlug es obligatorio.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const normalizedSlug = microcapsulaSlug.trim();
  const db = getDbFromContext(context);

  if (completado !== false) {
    await markComplete(db, session.id, normalizedSlug);
  } else {
    await unmarkComplete(db, session.id, normalizedSlug);
  }

  // Determine route to return updated progress
  let targetRoute = rutaSlug ? getRouteBySlug(rutaSlug) : undefined;
  if (!targetRoute) {
    const found = findCapsuleBySlug(normalizedSlug);
    targetRoute = found ? found.route : getRouteBySlug('ciberseguridad-whatsapp')!;
  }

  const progressRecords = await getProgressByStudent(db, session.id);
  const completedSlugs = progressRecords.map((p) => p.microcapsula_slug);
  const stats = calculateRouteProgress(completedSlugs, targetRoute);

  const routeCompletedSlugs = targetRoute.microcapsulas
    .filter((c) => completedSlugs.includes(c.slug))
    .map((c) => c.slug);

  return new Response(
    JSON.stringify({
      success: true,
      microcapsulaSlug: normalizedSlug,
      completado: completado !== false,
      progreso: {
        ruta: targetRoute.slug,
        total: stats.total,
        completadas: stats.completadas,
        porcentaje: stats.porcentaje,
        completadasSlugs: routeCompletedSlugs,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
