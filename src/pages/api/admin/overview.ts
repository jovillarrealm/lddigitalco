// LDDIGITALCO — Endpoint de Diagnóstico y Vista General de Administración
// Retorna estudiantes, consultas, sesión en vivo, contenido y configuración del entorno

import type { APIRoute } from 'astro';
import { getAuthServiceFromContext, getDbFromContext, getEnvFromContext } from '../../../lib/auth';
import { getAllStudents } from '../../../lib/db/estudiantes';
import { getAllConsultas } from '../../../lib/db/consultas';
import { getConfiguredLiveSession, getUpcomingLiveSession } from '../../../lib/courses/live-session';
import { getAllRoutes } from '../../../lib/courses';

export const prerender = false;

function checkAdminAuth(request: Request, env: Record<string, any>, session: any): boolean {
  if (session && session.rol === 'admin') return true;
  const adminKeyHeader = request.headers.get('x-admin-key');
  const url = new URL(request.url);
  const adminKeyQuery = url.searchParams.get('adminKey');
  const expectedKey = env.ADMIN_KEY || 'dev-admin-secret';
  return (adminKeyHeader === expectedKey) || (adminKeyQuery === expectedKey);
}

export const GET: APIRoute = async (context) => {
  const { request } = context;
  const authService = getAuthServiceFromContext(context);
  const env = getEnvFromContext(context);
  const session = await authService.getSessionFromRequest(request);

  if (!checkAdminAuth(request, env, session)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'No autorizado. Se requieren credenciales de administrador.',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const db = getDbFromContext(context);
  const [students, consultas] = await Promise.all([
    getAllStudents(db, 200),
    getAllConsultas(db, 200),
  ]);

  const liveSessionConfig = getConfiguredLiveSession();
  const liveSessionStatus = getUpcomingLiveSession();
  const routes = getAllRoutes();

  const isD1Live = Boolean(env.DB);
  const hasResend = Boolean(env.RESEND_API_KEY);
  const hasAuthSecret = Boolean(env.AUTH_SECRET);
  const tutorEmail = env.TUTOR_EMAIL || 'tutor@lddigital.co';

  return new Response(
    JSON.stringify({
      success: true,
      diagnostics: {
        d1Binding: isD1Live ? 'Conectado a Cloudflare D1' : 'Modo Memoria / Desarrollo Local',
        emailProvider: hasResend ? 'Resend API Activo' : 'FakeEmailService (Simulación)',
        authSecretConfigured: hasAuthSecret,
        tutorEmail,
        nodeEnv: env.NODE_ENV || 'development',
      },
      stats: {
        totalEstudiantes: students.length,
        estudiantesInscripcionCompleta: students.filter((s) => s.nivel_acceso === 'inscripcion_completa').length,
        estudiantesRutaAbierta: students.filter((s) => s.nivel_acceso === 'ruta_abierta').length,
        consultasTotales: consultas.length,
        consultasPendientes: consultas.filter((c) => c.estado === 'pendiente').length,
        rutasPublicadas: routes.length,
      },
      liveSession: {
        config: liveSessionConfig,
        status: liveSessionStatus,
      },
      students,
      consultas,
      routes,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
