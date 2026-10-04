import { describe, it, expect } from 'vitest';
import {
  getAllRoutes,
  getRouteBySlug,
  getCapsuleBySlug,
  findCapsuleBySlug,
  calculateRouteProgress,
} from '../src/lib/courses';

describe('Catálogo de Rutas y Microcápsulas', () => {
  it('getAllRoutes returns list containing at least the default open route', () => {
    const routes = getAllRoutes();
    expect(routes.length).toBeGreaterThan(0);

    const openRoute = routes.find((r) => r.slug === 'ciberseguridad-whatsapp');
    expect(openRoute).toBeDefined();
    expect(openRoute?.nivel).toBe('ruta_abierta');
    expect(openRoute?.microcapsulas.length).toBe(4);
  });

  it('getRouteBySlug returns correct route and undefined for nonexistent', () => {
    const route = getRouteBySlug('ciberseguridad-whatsapp');
    expect(route).toBeDefined();
    expect(route?.titulo).toContain('WhatsApp');

    const nonexistent = getRouteBySlug('no-existe');
    expect(nonexistent).toBeUndefined();
  });

  it('each microcapsula adheres to required schema', () => {
    const route = getRouteBySlug('ciberseguridad-whatsapp')!;
    for (const capsule of route.microcapsulas) {
      expect(capsule.id).toBeDefined();
      expect(capsule.slug).toBeDefined();
      expect(capsule.titulo).toBeDefined();
      expect(capsule.descripcion).toBeDefined();
      expect(capsule.duracion).toMatch(/^\d{2}:\d{2}$/);
      expect(capsule.youtubeId).toBeDefined();
      expect(capsule.youtubeId.length).toBeGreaterThan(5);
      expect(capsule.resumen).toBeDefined();
      expect(typeof capsule.orden).toBe('number');
    }
  });

  it('getCapsuleBySlug returns the capsule within a route', () => {
    const capsule = getCapsuleBySlug('ciberseguridad-whatsapp', 'identificar-estafas-whatsapp');
    expect(capsule).toBeDefined();
    expect(capsule?.orden).toBe(3);
    expect(capsule?.slug).toBe('identificar-estafas-whatsapp');
  });

  it('findCapsuleBySlug searches across catalog and returns route + capsule', () => {
    const found = findCapsuleBySlug('identificar-estafas-whatsapp');
    expect(found).toBeDefined();
    expect(found?.route.slug).toBe('ciberseguridad-whatsapp');
    expect(found?.capsule.orden).toBe(3);
  });

  it('calculateRouteProgress calculates progress percentage accurately', () => {
    const route = getRouteBySlug('ciberseguridad-whatsapp')!;
    
    // 0 completed
    const p0 = calculateRouteProgress([], route);
    expect(p0.total).toBe(4);
    expect(p0.completadas).toBe(0);
    expect(p0.porcentaje).toBe(0);

    // 2 completed
    const p2 = calculateRouteProgress(
      ['configurar-celular-vista', 'notas-voz-fotos-whatsapp'],
      route
    );
    expect(p2.total).toBe(4);
    expect(p2.completadas).toBe(2);
    expect(p2.porcentaje).toBe(50);

    // All 4 completed
    const p4 = calculateRouteProgress(
      [
        'configurar-celular-vista',
        'notas-voz-fotos-whatsapp',
        'identificar-estafas-whatsapp',
        'pedir-recetas-tramites-ia-voz',
      ],
      route
    );
    expect(p4.total).toBe(4);
    expect(p4.completadas).toBe(4);
    expect(p4.porcentaje).toBe(100);
  });
});
