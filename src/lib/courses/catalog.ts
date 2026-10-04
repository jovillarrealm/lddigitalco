// LDDIGITALCO — Catálogo de Rutas de Aprendizaje
// Delega al módulo profundo RutaCatalogo respetando la costura de adaptadores

import type { RutaAprendizaje, Microcapsula } from './types';
import { RutaCatalogo } from './ruta-catalogo';

export const RUTAS_CATALOG: RutaAprendizaje[] = RutaCatalogo.getInstance().listarRutas();

export function getAllRoutes(): RutaAprendizaje[] {
  return RutaCatalogo.getInstance().listarRutas();
}

export function getRouteBySlug(slug: string): RutaAprendizaje | undefined {
  return RutaCatalogo.getInstance().obtenerRutaPorSlug(slug);
}

export function getCapsuleBySlug(routeSlug: string, capsuleSlug: string): Microcapsula | undefined {
  return RutaCatalogo.getInstance().obtenerCapsula(routeSlug, capsuleSlug);
}

export function findCapsuleBySlug(capsuleSlug: string): { route: RutaAprendizaje; capsule: Microcapsula } | undefined {
  return RutaCatalogo.getInstance().buscarCapsula(capsuleSlug);
}

export function calculateRouteProgress(
  completedCapsuleSlugs: string[],
  route: RutaAprendizaje
): { total: number; completadas: number; porcentaje: number } {
  return RutaCatalogo.getInstance().calcularProgreso(completedCapsuleSlugs, route);
}
