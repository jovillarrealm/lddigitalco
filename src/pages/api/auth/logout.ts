import type { APIRoute } from 'astro';
import { getAuthServiceFromContext } from '../../../lib/auth';

export const prerender = false;

async function handleLogout(context: Parameters<APIRoute>[0]): Promise<Response> {
  const { request, redirect } = context;
  const authService = getAuthServiceFromContext(context);
  const logoutHeaders = authService.createLogoutHeaders();

  const accept = request.headers.get('accept') || '';
  const wantsJson = accept.includes('application/json');

  if (wantsJson) {
    const responseHeaders = new Headers(logoutHeaders);
    responseHeaders.set('Content-Type', 'application/json');
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sesión cerrada correctamente.',
      }),
      {
        status: 200,
        headers: responseHeaders,
      }
    );
  }

  const response = redirect('/alumnos', 302);
  const cookie = logoutHeaders.get('Set-Cookie');
  if (cookie) {
    response.headers.set('Set-Cookie', cookie);
  }
  return response;
}

export const POST: APIRoute = handleLogout;
export const GET: APIRoute = handleLogout;
