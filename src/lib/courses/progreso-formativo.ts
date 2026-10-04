// LDDIGITALCO — Módulo Profundo: ProgresoFormativo
// Encapsula las reglas de negocio del avance formativo, cálculo de porcentajes y control de acceso escalonado.

import type { D1Database, Estudiante } from '../db/types';
import type { SessionPayload } from '../auth/crypto';
import type { APIContext } from 'astro';
import { RutaCatalogo } from './ruta-catalogo';
import { getProgressByStudent, markComplete, unmarkComplete } from '../db/progreso';
import { getStudentById } from '../db/estudiantes';
import { hasFullAccess } from '../auth/tier';
import { getDbFromContext } from '../auth';

export type StudentUser = SessionPayload | Estudiante;

export class ProgresoAccesoDenegadoError extends Error {
  readonly code = 'requires_inscripcion_completa';
  constructor(message = 'Esta ruta requiere Inscripción Completa.') {
    super(message);
    this.name = 'ProgresoAccesoDenegadoError';
  }
}

export class ProgresoRutaNoEncontradaError extends Error {
  constructor(slug: string) {
    super(`Ruta de aprendizaje '${slug}' no encontrada.`);
    this.name = 'ProgresoRutaNoEncontradaError';
  }
}

export class ProgresoValidacionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProgresoValidacionError';
  }
}

export interface ResumenProgresoRuta {
  ruta: string;
  tituloRuta: string;
  total: number;
  completadas: number;
  porcentaje: number;
  completadasSlugs: string[];
  todosCompletados: boolean;
}

export interface ActualizarProgresoInput {
  microcapsulaSlug?: string;
  completado?: boolean;
  rutaSlug?: string;
}

export interface ActualizarProgresoResult {
  microcapsulaSlug: string;
  completado: boolean;
  progreso: {
    ruta: string;
    total: number;
    completadas: number;
    porcentaje: number;
    completadasSlugs: string[];
  };
}

export class ProgresoFormativo {
  constructor(
    private db: D1Database,
    private catalogo: RutaCatalogo = RutaCatalogo.getInstance()
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

  private validarAccesoRuta(student: Estudiante, nivelRuta: 'ruta_abierta' | 'inscripcion_completa'): void {
    if (nivelRuta === 'inscripcion_completa' && !hasFullAccess(student)) {
      throw new ProgresoAccesoDenegadoError();
    }
  }

  async consultarProgreso(student: StudentUser, rutaSlug: string = 'ciberseguridad-whatsapp'): Promise<ResumenProgresoRuta> {
    const estudianteActual = await this.resolverEstudianteActualizado(student);
    const ruta = this.catalogo.obtenerRutaPorSlug(rutaSlug);
    if (!ruta) {
      throw new ProgresoRutaNoEncontradaError(rutaSlug);
    }

    this.validarAccesoRuta(estudianteActual, ruta.nivel);

    const progressRecords = await getProgressByStudent(this.db, estudianteActual.id);
    const completedSlugs = progressRecords.map((p) => p.microcapsula_slug);
    const stats = this.catalogo.calcularProgreso(completedSlugs, ruta);

    const routeCompletedSlugs = ruta.microcapsulas
      .filter((c) => completedSlugs.includes(c.slug))
      .map((c) => c.slug);

    return {
      ruta: ruta.slug,
      tituloRuta: ruta.titulo,
      total: stats.total,
      completadas: stats.completadas,
      porcentaje: stats.porcentaje,
      completadasSlugs: routeCompletedSlugs,
      todosCompletados: stats.porcentaje === 100,
    };
  }

  async registrarCompletitud(
    student: StudentUser,
    params: ActualizarProgresoInput
  ): Promise<ActualizarProgresoResult> {
    const { microcapsulaSlug, completado = true, rutaSlug } = params;

    if (!microcapsulaSlug || typeof microcapsulaSlug !== 'string' || !microcapsulaSlug.trim()) {
      throw new ProgresoValidacionError('El campo microcapsulaSlug es obligatorio.');
    }

    const normalizedSlug = microcapsulaSlug.trim();
    const estudianteActual = await this.resolverEstudianteActualizado(student);

    // Resolver ruta objetivo para control de acceso y cálculo estadístico
    let targetRoute = rutaSlug ? this.catalogo.obtenerRutaPorSlug(rutaSlug) : undefined;
    if (!targetRoute) {
      const found = this.catalogo.buscarCapsula(normalizedSlug);
      targetRoute = found ? found.route : this.catalogo.obtenerRutaPorSlug('ciberseguridad-whatsapp');
    }

    if (!targetRoute) {
      throw new ProgresoRutaNoEncontradaError(rutaSlug || normalizedSlug);
    }

    this.validarAccesoRuta(estudianteActual, targetRoute.nivel);

    if (completado !== false) {
      await markComplete(this.db, estudianteActual.id, normalizedSlug);
    } else {
      await unmarkComplete(this.db, estudianteActual.id, normalizedSlug);
    }

    const progressRecords = await getProgressByStudent(this.db, estudianteActual.id);
    const completedSlugs = progressRecords.map((p) => p.microcapsula_slug);
    const stats = this.catalogo.calcularProgreso(completedSlugs, targetRoute);

    const routeCompletedSlugs = targetRoute.microcapsulas
      .filter((c) => completedSlugs.includes(c.slug))
      .map((c) => c.slug);

    return {
      microcapsulaSlug: normalizedSlug,
      completado: completado !== false,
      progreso: {
        ruta: targetRoute.slug,
        total: stats.total,
        completadas: stats.completadas,
        porcentaje: stats.porcentaje,
        completadasSlugs: routeCompletedSlugs,
      },
    };
  }
}

export function getProgresoFormativoFromContext(context: APIContext): ProgresoFormativo {
  const db = getDbFromContext(context);
  return new ProgresoFormativo(db);
}
