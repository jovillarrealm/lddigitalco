import type { APIRoute } from 'astro';
import { getAuthServiceFromContext, getDbFromContext, getEnvFromContext } from '../../lib/auth';
import { getEmailService } from '../../lib/email';
import { createConsulta } from '../../lib/db/consultas';
import { findCapsuleBySlug } from '../../lib/courses';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const authService = getAuthServiceFromContext(context);
  const session = await authService.getSessionFromRequest(request);

  if (!session) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'No autorizado. Debe iniciar sesión para enviar una consulta al tutor.',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Cuerpo de solicitud JSON no válido.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const { microcapsulaSlug, mensaje } = body || {};

  if (!microcapsulaSlug || typeof microcapsulaSlug !== 'string' || !microcapsulaSlug.trim()) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'El campo microcapsulaSlug es obligatorio.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!mensaje || typeof mensaje !== 'string' || !mensaje.trim()) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'El campo mensaje es obligatorio.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const normalizedSlug = microcapsulaSlug.trim();
  const normalizedMensaje = mensaje.trim();
  const db = getDbFromContext(context);

  // 1. Guardar consulta en la base de datos D1
  const consulta = await createConsulta(db, {
    estudianteId: session.id,
    microcapsulaSlug: normalizedSlug,
    mensaje: normalizedMensaje,
  });

  // 2. Resolver información de la microcápsula para el tutor
  const capsuleMatch = findCapsuleBySlug(normalizedSlug);
  const capsuleTitle = capsuleMatch?.capsule.titulo || normalizedSlug;

  // 3. Notificar al tutor mediante EmailService
  const env = getEnvFromContext(context);
  const tutorEmail = env.TUTOR_EMAIL || 'tutor@lddigital.co';
  const emailService = getEmailService(env);

  const subject = `[Consulta Formativa] Duda de ${session.nombre} en ${capsuleTitle}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Nueva Consulta Formativa</h2>
      <p style="color: #475569; font-size: 14px; margin-bottom: 20px;">
        Un estudiante ha enviado una duda formativa desde el Aula Digital a través del modal «Tengo una Duda».
      </p>

      <div style="background-color: #f1f5f9; border-left: 4px solid #00FF87; padding: 14px 16px; border-radius: 6px; margin-bottom: 20px;">
        <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Estudiante:</strong> ${session.nombre}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Correo:</strong> ${session.email}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Microcápsula:</strong> ${capsuleTitle} (<code>${normalizedSlug}</code>)</p>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h3 style="color: #92400e; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Pregunta del Estudiante:</h3>
        <p style="color: #1e293b; font-size: 16px; line-height: 1.6; white-space: pre-wrap; margin: 0;">${normalizedMensaje}</p>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 13px; color: #64748b;">
        <p style="margin: 0;">Para responder, puede responder directamente a este correo o escribir a <a href="mailto:${session.email}?subject=Respuesta a tu duda sobre ${encodeURIComponent(capsuleTitle)}" style="color: #059669; font-weight: bold;">${session.email}</a>.</p>
      </div>
    </div>
  `;

  const text = `Nueva Consulta Formativa en LDDIGITALCO\n\nEstudiante: ${session.nombre} (${session.email})\nMicrocápsula: ${capsuleTitle} (${normalizedSlug})\n\nPregunta del Estudiante:\n${normalizedMensaje}\n\nResponder a: ${session.email}`;

  await emailService.send({
    to: tutorEmail,
    subject,
    html,
    text,
  });

  return new Response(
    JSON.stringify({
      success: true,
      consultaId: consulta.id,
      mensaje: '¡Listo! Tu duda ha sido recibida por tu tutor de LDDIGITALCO. Te responderemos muy pronto a tu correo.',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
