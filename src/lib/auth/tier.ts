// LDDIGITALCO — Control Centralizado de Niveles de Acceso (ADR 0008)
// Define las reglas de acceso entre Ruta Abierta e Inscripción Completa.

import type { Estudiante } from '../db/types';
import type { SessionPayload } from './crypto';

export type StudentLike =
  | Pick<Estudiante, 'nivel_acceso' | 'rol'>
  | Pick<SessionPayload, 'nivel_acceso' | 'rol'>
  | null
  | undefined;

/**
 * Determina de forma centralizada si un estudiante tiene acceso completo
 * (Inscripción Completa, o rol administrativo/tutor).
 */
export function hasFullAccess(student: StudentLike): boolean {
  if (!student) return false;
  if (student.rol === 'admin' || student.rol === 'tutor') {
    return true;
  }
  return student.nivel_acceso === 'inscripcion_completa';
}
