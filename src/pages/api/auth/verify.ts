import type { APIRoute } from 'astro';
import { getAuthServiceFromContext } from '../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { request, url, redirect } = context;
  const token = url.searchParams.get('token');
  const acceptHeader = request.headers.get('accept') || '';
  const wantsJson = acceptHeader.includes('application/json');

  if (!token) {
    if (wantsJson) {
      return new Response(
        JSON.stringify({ success: false, error: 'Falta el token de verificación.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return redirect('/alumnos?error=token_faltante', 302);
  }

  const authService = getAuthServiceFromContext(context);
  const result = await authService.verifyMagicLink(token);

  if (!result.success || !result.cookieHeader) {
    if (wantsJson) {
      return new Response(
        JSON.stringify({ success: false, error: result.error || 'Token inválido o expirado.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return redirect('/alumnos?error=token_invalido', 302);
  }

  if (wantsJson) {
    return new Response(
      JSON.stringify({
        success: true,
        student: result.student,
        sessionToken: result.sessionToken,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': result.cookieHeader,
        },
      }
    );
  }

  // Redirigir al portal de alumnos con la cookie de sesión establecida
  const response = redirect('/alumnos?login=success', 302);
  response.headers.set('Set-Cookie', result.cookieHeader);
  return response;
};
