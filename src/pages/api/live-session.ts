// LDDIGITALCO — Endpoint de Consulta de Sesión en Vivo
// Adaptador HTTP delgado delegando al módulo profundo SesionEnVivoManager

import type { APIRoute } from 'astro';
import { getAuthServiceFromContext, getDbFromContext } from '../../lib/auth';
import { getStudentById } from '../../lib/db/estudiantes';
import { getSesionEnVivoManagerFromContext } from '../../lib/courses/live-session';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { request } = context;
  const authService = getAuthServiceFromContext(context);
  const session = await authService.getSessionFromRequest(request);

  let student: any = null;
  if (session) {
    const db = getDbFromContext(context);
    student = (await getStudentById(db, session.id)) || session;
  }

  const liveManager = getSesionEnVivoManagerFromContext(context);
  const studentView = await liveManager.getStudentView(student);

  return new Response(JSON.stringify(studentView), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
