// LDDIGITALCO — Módulo Profundo: AccesoEstudiante
// Colapsa la orquestación de Acceso sin Contraseña, Tokens, Cookies y Niveles de Acceso

import {
  AuthService,
  type AuthServiceOptions,
  type RequestMagicLinkInput,
  type RequestMagicLinkResult,
  type VerifyMagicLinkResult,
} from './service';
import type { SessionPayload } from './crypto';
import type { Estudiante, NivelAcceso } from '../db/types';
import { getStudentByEmail, upgradeStudentAccess } from '../db/estudiantes';

export interface ActualizarNivelInput {
  email?: string;
  nivelAcceso?: string;
  adminKeyHeader?: string | null;
  expectedAdminKey?: string;
  session?: SessionPayload | null;
}

export interface ActualizarNivelResult {
  status: number;
  success: boolean;
  message?: string;
  error?: string;
  student?: Estudiante;
}

export class AccesoEstudiante extends AuthService {
  constructor(options: AuthServiceOptions) {
    super(options);
  }

  async parsearCredenciales(request: Request): Promise<{ email?: string; nombre?: string }> {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const body = await request.json();
        return { email: body?.email, nombre: body?.nombre };
      } catch {
        return {};
      }
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      try {
        const formData = await request.formData();
        return {
          email: formData.get('email')?.toString(),
          nombre: formData.get('nombre')?.toString(),
        };
      } catch {
        return {};
      }
    }
    return {};
  }

  async registrarRutaAbierta(
    request: Request,
    origin: string
  ): Promise<{ status: number; body: Record<string, any> }> {
    const { email, nombre } = await this.parsearCredenciales(request);
    const normalized = email?.trim().toLowerCase();
    if (!normalized || !normalized.includes('@') || !normalized.includes('.')) {
      return {
        status: 400,
        body: { success: false, error: 'Por favor, ingrese un correo electrónico válido.' },
      };
    }

    const linkResult = await this.requestMagicLink({
      email: normalized,
      nombre: nombre?.trim(),
      origin,
    });

    if (!linkResult.success) {
      return {
        status: 400,
        body: { success: false, error: linkResult.error || 'No se pudo enviar el correo de acceso.' },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        message:
          '¡Bienvenido a la Ruta Abierta! Te enviamos tu enlace de acceso a tu correo. Revisa tu bandeja de entrada para ingresar sin contraseña.',
        student: linkResult.student,
      },
    };
  }

  async actualizarNivelEstudiante(input: ActualizarNivelInput): Promise<ActualizarNivelResult> {
    const isAuthorized =
      (input.session && input.session.rol === 'admin') ||
      (Boolean(input.adminKeyHeader) && input.adminKeyHeader === (input.expectedAdminKey || 'dev-admin-secret'));

    if (!isAuthorized) {
      const status = (!input.session && !input.adminKeyHeader) ? 401 : 403;
      return {
        status,
        success: false,
        error: 'No autorizado. Se requieren credenciales de administrador para actualizar niveles de acceso.',
      };
    }

    let email = input.email;
    if (!email && input.session) {
      email = input.session.email;
    }

    if (!email || typeof email !== 'string') {
      return {
        status: 400,
        success: false,
        error: 'El campo correo electrónico es obligatorio para actualizar el nivel de acceso.',
      };
    }

    const nivel = (input.nivelAcceso || 'inscripcion_completa') as NivelAcceso;
    const db = (this as any).db;
    const existing = await getStudentByEmail(db, email);
    if (!existing) {
      return {
        status: 404,
        success: false,
        error: `Estudiante con correo '${email}' no encontrado.`,
      };
    }

    const updated = await upgradeStudentAccess(db, email, nivel);
    return {
      status: 200,
      success: true,
      message: `Nivel de acceso actualizado exitosamente a '${nivel}'.`,
      student: updated,
    };
  }
}
