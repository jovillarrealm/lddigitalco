// LDDIGITALCO — Módulo Profundo: ConsultaFormativaService
// Encapsula las reglas pedagógicas de atención de dudas, persistencia D1 y notificación al tutor

import type { D1Database, Estudiante, Consulta } from '../db/types';
import type { SessionPayload } from '../auth/crypto';
import { createConsulta, getConsultaById, updateConsultaEstado, getConsultasByEstudiante } from '../db/consultas';
import { getStudentById } from '../db/estudiantes';
import { hasFullAccess } from '../auth/tier';
import { findCapsuleBySlug } from '../courses';
import { NotificadorFormativo } from '../email/notificador-formativo';

export type StudentUser = SessionPayload | Estudiante;

export class ConsultaAccesoDenegadoError extends Error {
  readonly code = 'requires_inscripcion_completa';
  constructor(message = 'El envío de consultas formativas directas al tutor requiere Inscripción Completa.') {
    super(message);
    this.name = 'ConsultaAccesoDenegadoError';
  }
}

export class ConsultaValidacionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConsultaValidacionError';
  }
}

export class ConsultaNoEncontradaError extends Error {
  constructor(message = 'Consulta formativa no encontrada.') {
    super(message);
    this.name = 'ConsultaNoEncontradaError';
  }
}

export interface EnviarConsultaInput {
  student: StudentUser;
  microcapsulaSlug: string;
  mensaje: string;
}

export interface EnviarConsultaResult {
  consultaId: string;
  mensaje: string;
}

export class ConsultaFormativaService {
  constructor(
    private db: D1Database,
    private notificador: NotificadorFormativo,
    private tutorEmail: string = 'tutor@lddigital.co'
  ) {}

  private async resolverEstudianteActualizado(student: StudentUser): Promise<Estudiante> {
    const fresh = await getStudentById(this.db, student.id);
    if (fresh) return fresh;
    return {
      id: student.id,
      email: student.email,
      nombre: student.nombre,
      rol: student.rol,
      nivel_acceso: student.nivel_acceso,
      creado_en: (student as any).creado_en || new Date().toISOString(),
    };
  }

  async enviarConsulta(input: EnviarConsultaInput): Promise<EnviarConsultaResult> {
    const estudianteActual = await this.resolverEstudianteActualizado(input.student);

    if (!hasFullAccess(estudianteActual)) {
      throw new ConsultaAccesoDenegadoError();
    }

    const { microcapsulaSlug, mensaje } = input;

    if (!microcapsulaSlug || typeof microcapsulaSlug !== 'string' || !microcapsulaSlug.trim()) {
      throw new ConsultaValidacionError('El campo microcapsulaSlug es obligatorio.');
    }

    if (!mensaje || typeof mensaje !== 'string' || !mensaje.trim()) {
      throw new ConsultaValidacionError('El campo mensaje es obligatorio.');
    }

    const normalizedSlug = microcapsulaSlug.trim();
    const normalizedMensaje = mensaje.trim();

    // 1. Guardar en base de datos D1
    const consulta = await createConsulta(this.db, {
      estudianteId: estudianteActual.id,
      microcapsulaSlug: normalizedSlug,
      mensaje: normalizedMensaje,
    });

    // 2. Resolver título pedagógico de la microcápsula
    const capsuleMatch = findCapsuleBySlug(normalizedSlug);
    const capsuleTitle = capsuleMatch?.capsule.titulo || normalizedSlug;

    // 3. Notificar al tutor mediante el módulo profundo NotificadorFormativo
    await this.notificador.notificarConsultaATutor({
      tutorEmail: this.tutorEmail,
      student: estudianteActual,
      microcapsulaTitulo: capsuleTitle,
      microcapsulaSlug: normalizedSlug,
      mensaje: normalizedMensaje,
    });

    return {
      consultaId: consulta.id,
      mensaje: '¡Listo! Tu duda ha sido recibida por tu tutor de LDDIGITALCO. Te responderemos muy pronto a tu correo.',
    };
  }

  async cambiarEstado(consultaId: string, nuevoEstado: string): Promise<Consulta> {
    if (!consultaId || typeof consultaId !== 'string') {
      throw new ConsultaValidacionError('consultaId es requerido.');
    }

    if (nuevoEstado !== 'pendiente' && nuevoEstado !== 'respondida') {
      throw new ConsultaValidacionError("estado debe ser 'pendiente' o 'respondida'.");
    }

    const existing = await getConsultaById(this.db, consultaId);
    if (!existing) {
      throw new ConsultaNoEncontradaError();
    }

    await updateConsultaEstado(this.db, consultaId, nuevoEstado as 'pendiente' | 'respondida');
    return {
      ...existing,
      estado: nuevoEstado as 'pendiente' | 'respondida',
    };
  }

  async listarPorEstudiante(estudianteId: string): Promise<Consulta[]> {
    return getConsultasByEstudiante(this.db, estudianteId);
  }
}
