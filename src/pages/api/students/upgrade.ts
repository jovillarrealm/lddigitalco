// LDDIGITALCO — Endpoint de Actualización de Nivel de Acceso
// Adaptador HTTP delgado delegando al módulo profundo AccesoEstudiante

import type { APIRoute } from 'astro';
import { getAccesoEstudianteFromContext, getEnvFromContext } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const auth = getAccesoEstudianteFromContext(context);
  const env = getEnvFromContext(context);

  const session = await auth.getSessionFromRequest(request);
  const adminKeyHeader = request.headers.get('x-admin-key');
  const expectedAdminKey = env.ADMIN_KEY || 'dev-admin-secret';

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Body opcional o vacío
  }

  const result = await auth.actualizarNivelEstudiante({
    email: body.email,
    nivelAcceso: body.nivelAcceso,
    adminKeyHeader,
    expectedAdminKey,
    session,
  });

  return new Response(
    JSON.stringify({
      success: result.success,
      ...(result.error ? { error: result.error } : {}),
      ...(result.message ? { message: result.message } : {}),
      ...(result.student ? { student: result.student } : {}),
    }),
    {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
