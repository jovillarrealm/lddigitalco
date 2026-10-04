// LDDIGITALCO — Plantilla de Alerta de Consulta Formativa para el Tutor

import type { Estudiante } from '../../db/types';
import type { RenderedEmail } from './acceso-sin-contrasena';

export interface AlertaDudaTutorTemplateInput {
  student: Estudiante;
  microcapsulaTitulo: string;
  microcapsulaSlug: string;
  mensaje: string;
}

export function renderAlertaDudaTutorEmail(
  input: AlertaDudaTutorTemplateInput
): RenderedEmail {
  const { student, microcapsulaTitulo, microcapsulaSlug, mensaje } = input;
  const subject = `[Consulta Formativa] Duda de ${student.nombre} en ${microcapsulaTitulo}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, sans-serif; padding: 20px; color: #1e293b; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
    <h2 style="color: #0f172a; margin-top: 0;">❓ Nueva Consulta Formativa Recibida</h2>
    <p>El estudiante <strong>${student.nombre}</strong> (<a href="mailto:${student.email}">${student.email}</a>) ha enviado una duda pedagógica durante una lección.</p>
    
    <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px;"><strong>Microcápsula:</strong> ${microcapsulaTitulo} (<code>${microcapsulaSlug}</code>)</p>
      <p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Nivel de Acceso:</strong> ${student.nivel_acceso}</p>
    </div>

    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <h3 style="margin-top: 0; color: #92400e; font-size: 14px;">Pregunta del Estudiante:</h3>
      <p style="margin: 0; font-size: 16px; color: #78350f; white-space: pre-wrap;">${mensaje}</p>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
      Puede responder directamente a este correo o escribirle al estudiante a su dirección: <strong>${student.email}</strong>
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Nueva Consulta Formativa:
Estudiante: ${student.nombre} (${student.email})
Microcápsula: ${microcapsulaTitulo} (${microcapsulaSlug})

Pregunta:
${mensaje}
  `.trim();

  return { subject, html, text };
}
