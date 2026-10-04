import { describe, it, expect } from 'vitest';
import { getAllRoutes, getRouteBySlug } from '../src/lib/courses/catalog';
import { EmDashContentAdapter, DEFAULT_STATIC_RUTAS } from '../src/lib/courses/adapters';
import { getDbFromContext } from '../src/lib/auth';

describe('Admin SSR Environment Resilience', () => {
  it('getAllRoutes never throws and returns full catalog of 3 learning routes', () => {
    const routes = getAllRoutes();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBe(3);

    const whatsapp = getRouteBySlug('ciberseguridad-whatsapp');
    expect(whatsapp).toBeDefined();
    expect(whatsapp?.nivel).toBe('ruta_abierta');
    expect(whatsapp?.microcapsulas.length).toBe(4);

    const banca = getRouteBySlug('banca-movil-segura');
    expect(banca).toBeDefined();
    expect(banca?.nivel).toBe('inscripcion_completa');
    expect(banca?.microcapsulas.length).toBe(3);

    const ia = getRouteBySlug('ia-practica-productividad');
    expect(ia).toBeDefined();
    expect(ia?.nivel).toBe('inscripcion_completa');
    expect(ia?.microcapsulas.length).toBe(2);
  });

  it('EmDashContentAdapter falls back to DEFAULT_STATIC_RUTAS if directory is missing or unreadable', () => {
    const brokenAdapter = new EmDashContentAdapter('/non-existent-directory-on-edge');
    const routes = brokenAdapter.listarRutas();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBe(DEFAULT_STATIC_RUTAS.length);
    expect(routes[0].slug).toBe('ciberseguridad-whatsapp');
  });

  it('getDbFromContext safely provides a D1Database interface even if env.DB is not bound', () => {
    const mockContext: any = {
      locals: {
        runtime: {
          env: {}, // No DB binding
        },
      },
      request: new Request('http://localhost:4321/admin'),
    };

    const db = getDbFromContext(mockContext);
    expect(db).toBeDefined();
    expect(typeof db.prepare).toBe('function');
  });
});
