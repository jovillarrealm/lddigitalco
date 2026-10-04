import type { APIRoute } from 'astro';
import { getAuthServiceFromContext, getDbFromContext } from '../../../lib/auth';
import { findOrCreateStudent } from '../../../lib/db/estudiantes';

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
  } else if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
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
    try {
      const body = await request.json();
      email = body.email;
      nombre = body.nombre;
    } catch {
      // Ignorar fallback
    }
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Por favor, ingrese un correo electrónico válido.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const db = getDbFromContext(context);
  // Ensure student exists with ruta_abierta
  const student = await findOrCreateStudent(db, {
    email: normalizedEmail,
    nombre: nombre?.trim(),
    nivel_acceso: 'ruta_abierta',
  });

  const authService = getAuthServiceFromContext(context);
  const origin = `${url.protocol}//${url.host}`;

  const linkResult = await authService.requestMagicLink({
    email: student.email,
    nombre: student.nombre,
    origin,
  });

  if (!linkResult.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: linkResult.error || 'No se pudo enviar el correo de acceso.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message:
        '¡Bienvenido a la Ruta Abierta! Te enviamos tu enlace de acceso a tu correo. Revisa tu bandeja de entrada para ingresar sin contraseña.',
      student,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
