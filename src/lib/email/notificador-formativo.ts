// LDDIGITALCO — Módulo Profundo: NotificadorFormativo
// Encapsula las reglas de notificación pedagógica, plantillas WCAG y delegación a transportes (Resend / Fake)

import type { EmailService, SendEmailResult } from './types';
import type { Estudiante } from '../db/types';
import { renderAccesoSinContrasenaEmail } from './templates/acceso-sin-contrasena';
import { renderAlertaDudaTutorEmail } from './templates/alerta-duda-tutor';

export interface EnviarAccesoParams {
  email: string;
  nombre?: string;
  verifyUrl: string;
}

export interface NotificarConsultaParams {
  tutorEmail: string;
  student: Estudiante;
  microcapsulaTitulo: string;
  microcapsulaSlug: string;
  mensaje: string;
}

export class NotificadorFormativo {
  constructor(private transport: EmailService) {}

  async enviarAccesoSinContrasena(params: EnviarAccesoParams): Promise<SendEmailResult> {
    const rendered = renderAccesoSinContrasenaEmail({
      verifyUrl: params.verifyUrl,
      studentName: params.nombre,
    });

    return this.transport.send({
      to: params.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async notificarConsultaATutor(params: NotificarConsultaParams): Promise<SendEmailResult> {
    const rendered = renderAlertaDudaTutorEmail({
      student: params.student,
      microcapsulaTitulo: params.microcapsulaTitulo,
      microcapsulaSlug: params.microcapsulaSlug,
      mensaje: params.mensaje,
    });

    return this.transport.send({
      to: params.tutorEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  getTransport(): EmailService {
    return this.transport;
  }
}
