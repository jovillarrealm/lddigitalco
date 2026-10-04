import type { D1Database, Estudiante } from '../db/types';
import type { EmailService } from '../email/types';
import { findOrCreateStudent, getStudentById, getStudentByEmail } from '../db/estudiantes';
import {
  createMagicLinkToken,
  verifyMagicLinkToken,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from './crypto';

export interface AuthServiceOptions {
  db: D1Database;
  emailService: EmailService;
  secret: string;
  appUrl?: string;
  isProduction?: boolean;
}

export interface RequestMagicLinkInput {
  email: string;
  nombre?: string;
  origin?: string;
}

export interface RequestMagicLinkResult {
  success: boolean;
  message?: string;
  error?: string;
  student?: Estudiante;
}

export interface VerifyMagicLinkResult {
  success: boolean;
  student?: Estudiante;
  sessionToken?: string;
  cookieHeader?: string;
  error?: string;
}

export class AuthService {
  private db: D1Database;
  private emailService: EmailService;
  private secret: string;
  private appUrl: string;
  private isProduction: boolean;

  constructor(options: AuthServiceOptions) {
    this.db = options.db;
    this.emailService = options.emailService;
    this.secret = options.secret;
    this.appUrl = options.appUrl || 'http://localhost:4321';
    this.isProduction = options.isProduction ?? false;
  }

  async requestMagicLink(input: RequestMagicLinkInput): Promise<RequestMagicLinkResult> {
    const rawEmail = input.email?.trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes('@') || !rawEmail.includes('.')) {
      return {
        success: false,
        error: 'Por favor, ingrese un correo electrónico válido.',
      };
    }

    try {
      const student = await findOrCreateStudent(this.db, {
        email: rawEmail,
        nombre: input.nombre,
      });

      const token = await createMagicLinkToken(
        { email: student.email, studentId: student.id },
        this.secret,
        15 * 60 // 15 minutos
      );

      const origin = input.origin || this.appUrl;
      const verifyUrl = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}`;

      const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Acceso sin Contraseña — LDDIGITALCO</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #070B13; font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #FFFFFF;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #0F172A; border-radius: 16px; border: 1px solid #1E293B; padding: 32px; text-align: left;">
          <tr>
            <td>
              <h1 style="color: #00FF87; font-size: 24px; margin-top: 0; margin-bottom: 8px;">LDDIGITALCO</h1>
              <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Su enlace de acceso al Aula Digital</h2>
              <p style="color: #CBD5E1; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Hola <strong>${student.nombre}</strong>,<br><br>
                Ha solicitado ingresar a su portal de aprendizaje en <strong>LDDIGITALCO</strong> sin necesidad de contraseñas.
              </p>
              <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="border-radius: 12px; background-color: #00FF87;">
                    <a href="${verifyUrl}" target="_blank" style="font-size: 16px; font-weight: bold; color: #020617; text-decoration: none; padding: 14px 28px; border-radius: 12px; display: inline-block;">
                      Entrar a mi Aula Digital en 1 Clic
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #94A3B8; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
                Este enlace es seguro y expirará en <strong>15 minutos</strong>. Si el botón no abre directamente, copie y pegue el siguiente enlace en su navegador:
              </p>
              <p style="background-color: #070B13; padding: 12px; border-radius: 8px; font-size: 12px; color: #00D2FF; word-break: break-all;">
                ${verifyUrl}
              </p>
              <hr style="border: none; border-top: 1px solid #1E293B; margin: 24px 0;">
              <p style="color: #64748B; font-size: 12px; margin: 0;">
                Si usted no solicitó este enlace, puede ignorar este mensaje tranquilamente. Nadie puede acceder a su portal sin este enlace.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const textContent = `
Hola ${student.nombre},

Su enlace de acceso a LDDIGITALCO está listo:
${verifyUrl}

Este enlace expira en 15 minutos. Si usted no solicitó este mensaje, puede ignorarlo con tranquilidad.
      `.trim();

      const sendResult = await this.emailService.send({
        to: student.email,
        subject: 'Su enlace de acceso a LDDIGITALCO — Entrada en 1 Clic',
        html: htmlContent,
        text: textContent,
      });

      if (!sendResult.success) {
        return {
          success: false,
          error: sendResult.error || 'No se pudo enviar el correo de acceso.',
        };
      }

      return {
        success: true,
        message: 'Enlace de acceso enviado a su correo electrónico.',
        student,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Error interno al procesar el enlace de acceso.',
      };
    }
  }

  async verifyMagicLink(token: string): Promise<VerifyMagicLinkResult> {
    if (!token) {
      return {
        success: false,
        error: 'El enlace de acceso es inválido o no contiene un token.',
      };
    }

    const payload = await verifyMagicLinkToken(token, this.secret);
    if (!payload) {
      return {
        success: false,
        error: 'El enlace de acceso es inválido o ha expirado. Por favor solicite uno nuevo.',
      };
    }

    let student = await getStudentById(this.db, payload.studentId);
    if (!student) {
      student = await getStudentByEmail(this.db, payload.email);
    }

    if (!student) {
      return {
        success: false,
        error: 'Estudiante no encontrado en el sistema.',
      };
    }

    const sessionMaxAge = 30 * 24 * 3600; // 30 días
    const sessionToken = await createSessionToken(student, this.secret, sessionMaxAge);

    const secureFlag = this.isProduction ? '; Secure' : '';
    const cookieHeader = `lms_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionMaxAge}${secureFlag}`;

    return {
      success: true,
      student,
      sessionToken,
      cookieHeader,
    };
  }

  async getSessionFromRequest(request: Request): Promise<SessionPayload | null> {
    const cookieHeader = request.headers.get('cookie') || request.headers.get('Cookie');
    if (!cookieHeader) return null;

    const cookies = this.parseCookies(cookieHeader);
    const sessionToken = cookies['lms_session'];
    if (!sessionToken) return null;

    const payload = await verifySessionToken(sessionToken, this.secret);
    return payload;
  }

  createLogoutHeaders(): Headers {
    const headers = new Headers();
    const secureFlag = this.isProduction ? '; Secure' : '';
    headers.set(
      'Set-Cookie',
      `lms_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`
    );
    return headers;
  }

  // Helper para generar tokens de prueba
  async createTokenForTesting(options: {
    email: string;
    studentId: string;
    expiresInSeconds: number;
  }): Promise<string> {
    return createMagicLinkToken(
      { email: options.email, studentId: options.studentId },
      this.secret,
      options.expiresInSeconds
    );
  }

  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    const items = cookieHeader.split(';');
    for (const item of items) {
      const parts = item.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        cookies[key] = decodeURIComponent(val);
      }
    }
    return cookies;
  }
}
