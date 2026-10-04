import { describe, it, expect } from 'vitest';
import { RutaCatalogo } from '../src/lib/courses/ruta-catalogo';
import { InMemoriaRutaAdapter, EmDashContentAdapter } from '../src/lib/courses/adapters';
import type { RutaAprendizaje } from '../src/lib/courses/types';

describe('Módulo Profundo: RutaCatalogo & Adaptadores', () => {
  const fakeRuta: RutaAprendizaje = {
    id: 'ruta-test',
    slug: 'ruta-test',
    titulo: 'Ruta de Prueba Unitaria',
    descripcion: 'Descripción de prueba',
    nivel: 'ruta_abierta',
    duracion_total: '05:00',
    microcapsulas: [
      {
        id: 'cap-test-1',
        slug: 'capsula-test-1',
        titulo: 'Cápsula 1',
        descripcion: 'Detalle 1',
        duracion: '02:30',
        youtubeId: 'abc123xyz',
        resumen: 'Resumen 1',
        orden: 1,
      },
      {
        id: 'cap-test-2',
        slug: 'capsula-test-2',
        titulo: 'Cápsula 2',
        descripcion: 'Detalle 2',
        duracion: '02:30',
        youtubeId: 'def456uvw',
        resumen: 'Resumen 2',
        orden: 2,
      },
    ],
  };

  it('permite intercambiar la implementación mediante InMemoriaRutaAdapter (seam)', async () => {
    const memoryAdapter = new InMemoriaRutaAdapter([fakeRuta]);
    const catalogo = new RutaCatalogo(memoryAdapter);

    const rutas = catalogo.listarRutas();
    expect(rutas).toHaveLength(1);
    expect(rutas[0].slug).toBe('ruta-test');

    const ruta = catalogo.obtenerRutaPorSlug('ruta-test');
    expect(ruta).toBeDefined();
    expect(ruta?.titulo).toBe('Ruta de Prueba Unitaria');

    const capsula = catalogo.obtenerCapsula('ruta-test', 'capsula-test-2');
    expect(capsula).toBeDefined();
    expect(capsula?.titulo).toBe('Cápsula 2');

    const progreso = catalogo.calcularProgreso(['capsula-test-1'], ruta!);
    expect(progreso.total).toBe(2);
    expect(progreso.completadas).toBe(1);
    expect(progreso.porcentaje).toBe(50);
  });

  it('EmDashContentAdapter carga las colecciones reales desde src/content/rutas', async () => {
    const contentAdapter = new EmDashContentAdapter();
    const rutas = contentAdapter.listarRutas();

    expect(rutas.length).toBeGreaterThanOrEqual(2);
    const whatsapp = rutas.find((r) => r.slug === 'ciberseguridad-whatsapp');
    expect(whatsapp).toBeDefined();
    expect(whatsapp?.nivel).toBe('ruta_abierta');
    expect(whatsapp?.microcapsulas.length).toBeGreaterThanOrEqual(4);

    const banca = rutas.find((r) => r.slug === 'banca-movil-segura');
    expect(banca).toBeDefined();
    expect(banca?.nivel).toBe('inscripcion_completa');
  });

  it('buscarCapsula localiza tanto la ruta contenedora como la microcápsula', async () => {
    const memoryAdapter = new InMemoriaRutaAdapter([fakeRuta]);
    const catalogo = new RutaCatalogo(memoryAdapter);

    const match = catalogo.buscarCapsula('capsula-test-1');
    expect(match).toBeDefined();
    expect(match?.route.slug).toBe('ruta-test');
    expect(match?.capsule.id).toBe('cap-test-1');

    const noMatch = catalogo.buscarCapsula('inexistente');
    expect(noMatch).toBeUndefined();
  });
});
