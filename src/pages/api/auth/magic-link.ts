import type { APIRoute } from 'astro';
import { getAuthServiceFromContext } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { request, url } = context;

  let email: string | undefined;
  let nombre: string | undefined;

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      const body = await request.json();
      email = body.email;
      nombre = body.nombre;
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'JSON mal formado en la solicitud.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    try {
      const formData = await request.formData();
      email = formData.get('email')?.toString();
      nombre = formData.get('nombre')?.toString();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Datos de formulario inválidos.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } else {
    // Intentar leer JSON por defecto
    try {
      const body = await request.json();
      email = body.email;
      nombre = body.nombre;
    } catch {
      // Ignorar
    }
  }

  if (!email) {
    return new Response(
      JSON.stringify({ success: false, error: 'El campo correo electrónico es obligatorio.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const authService = getAuthServiceFromContext(context);
  const origin = `${url.protocol}//${url.host}`;

  const result = await authService.requestMagicLink({
    email,
    nombre,
    origin,
  });

  if (!result.success) {
    return new Response(
      JSON.stringify({ success: false, error: result.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: result.message || 'Enlace de acceso enviado a su correo electrónico.',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
