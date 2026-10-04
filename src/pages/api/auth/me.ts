import type { APIRoute } from 'astro';
import { getAuthServiceFromContext, getDbFromContext } from '../../../lib/auth';
import { getStudentById } from '../../../lib/db/estudiantes';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { request } = context;
  const authService = getAuthServiceFromContext(context);
  const session = await authService.getSessionFromRequest(request);

  if (!session) {
    return new Response(
      JSON.stringify({
        authenticated: false,
        student: null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const db = getDbFromContext(context);
  const freshStudent = await getStudentById(db, session.id);
  const student = freshStudent || session;

  return new Response(
    JSON.stringify({
      authenticated: true,
      student: {
        id: student.id,
        email: student.email,
        nombre: student.nombre,
        rol: student.rol,
        nivel_acceso: student.nivel_acceso,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

