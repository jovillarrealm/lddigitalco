import type { APIRoute } from 'astro';
import { getAuthServiceFromContext, getDbFromContext } from '../../../lib/auth';
import { upgradeStudentAccess, getStudentByEmail } from '../../../lib/db/estudiantes';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const db = getDbFromContext(context);
  const authService = getAuthServiceFromContext(context);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Maybe empty or form
  }

  let email = body.email;
  const nivelAcceso = body.nivelAcceso || 'inscripcion_completa';

  if (!email) {
    // Attempt to use current session student
    const session = await authService.getSessionFromRequest(request);
    if (session) {
      email = session.email;
    }
  }

  if (!email || typeof email !== 'string') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'El campo correo electrónico es obligatorio para actualizar el nivel de acceso.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const existing = await getStudentByEmail(db, email);
  if (!existing) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Estudiante con correo '${email}' no encontrado.`,
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const updatedStudent = await upgradeStudentAccess(db, email, nivelAcceso);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Nivel de acceso actualizado exitosamente a '${nivelAcceso}'.`,
      student: updatedStudent,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
