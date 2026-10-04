// LDDIGITALCO — Módulo Profundo: RutaCatalogo
// Unifica el catálogo editorial de Rutas de Aprendizaje y Microcápsulas detrás de una única costura

import type { RutaAprendizaje, Microcapsula } from './types';
import { EmDashContentAdapter, type IRutaCatalogoAdapter } from './adapters';

export class RutaCatalogo {
  private adapter: IRutaCatalogoAdapter;
  private static instance: RutaCatalogo | null = null;

  constructor(adapter?: IRutaCatalogoAdapter) {
    this.adapter = adapter || new EmDashContentAdapter();
  }

  static getInstance(): RutaCatalogo {
    if (!RutaCatalogo.instance) {
      RutaCatalogo.instance = new RutaCatalogo();
    }
    return RutaCatalogo.instance;
  }

  static setInstance(instance: RutaCatalogo | null): void {
    RutaCatalogo.instance = instance;
  }

  setAdapter(adapter: IRutaCatalogoAdapter): void {
    this.adapter = adapter;
  }

  listarRutas(): RutaAprendizaje[] {
    const res = this.adapter.listarRutas();
    return Array.isArray(res) ? res : [];
  }

  obtenerRutaPorSlug(slug: string): RutaAprendizaje | undefined {
    return this.listarRutas().find((r) => r.slug === slug);
  }

  obtenerCapsula(rutaSlug: string, capsulaSlug: string): Microcapsula | undefined {
    const ruta = this.obtenerRutaPorSlug(rutaSlug);
    if (!ruta) return undefined;
    return ruta.microcapsulas.find((c) => c.slug === capsulaSlug);
  }

  buscarCapsula(capsulaSlug: string): { route: RutaAprendizaje; capsule: Microcapsula } | undefined {
    for (const route of this.listarRutas()) {
      const capsule = route.microcapsulas.find((c) => c.slug === capsulaSlug);
      if (capsule) {
        return { route, capsule };
      }
    }
    return undefined;
  }

  calcularProgreso(
    completedCapsuleSlugs: string[],
    route: RutaAprendizaje
  ): { total: number; completadas: number; porcentaje: number } {
    const total = route.microcapsulas.length;
    if (total === 0) {
      return { total: 0, completadas: 0, porcentaje: 0 };
    }

    const completedSet = new Set(completedCapsuleSlugs);
    let count = 0;
    for (const c of route.microcapsulas) {
      if (completedSet.has(c.slug)) {
        count++;
      }
    }

    const porcentaje = Math.round((count / total) * 100);
    return {
      total,
      completadas: count,
      porcentaje,
    };
  }
}

// Factoría por defecto
export const catalogoRutas = RutaCatalogo.getInstance();
