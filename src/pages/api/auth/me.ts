import type { APIRoute } from 'astro';
import { getAuthServiceFromContext } from '../../../lib/auth';

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

  return new Response(
    JSON.stringify({
      authenticated: true,
      student: {
        id: session.id,
        email: session.email,
        nombre: session.nombre,
        rol: session.rol,
        nivel_acceso: session.nivel_acceso,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
