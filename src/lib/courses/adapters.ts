// LDDIGITALCO — Adaptadores de Contenido para el Catálogo de Rutas
// Conforma la costura de desacoplamiento entre EmDash CMS / Markdown y la lógica del LMS

import type { RutaAprendizaje, Microcapsula } from './types';
import fs from 'node:fs';
import path from 'node:path';

export interface IRutaCatalogoAdapter {
  listarRutas(): Promise<RutaAprendizaje[]> | RutaAprendizaje[];
}

export const DEFAULT_STATIC_RUTAS: RutaAprendizaje[] = [
  {
    id: 'ruta-ciberseguridad-whatsapp',
    slug: 'ciberseguridad-whatsapp',
    titulo: 'Ciberseguridad y Prevención de Estafas en WhatsApp',
    descripcion:
      'Aprenda a configurar su dispositivo móvil de forma segura, comunicarse con su familia y blindar su cuenta de WhatsApp contra engaños, enlaces sospechosos y suplantaciones.',
    nivel: 'ruta_abierta',
    duracion_total: '10:50',
    microcapsulas: [
      {
        id: 'cap-01',
        slug: 'configurar-celular-vista',
        titulo: 'Cápsula #1: Cómo configurar tu celular para no cansar la vista',
        descripcion:
          'Aprende a aumentar el tamaño de letra, ajustar el brillo automático y activar el filtro de luz nocturna para leer sin fatiga visual.',
        duracion: '02:15',
        youtubeId: 'dQw4w9WgXcQ',
        resumen:
          'Aumentar el tamaño del texto y activar el filtro de luz cálida reduce hasta un 80% la fatiga al leer en el celular. Puede activarlo en Ajustes > Pantalla.',
        orden: 1,
      },
      {
        id: 'cap-02',
        slug: 'notas-voz-fotos-whatsapp',
        titulo: 'Cápsula #2: Cómo enviar notas de voz y fotos por WhatsApp a tu familia',
        descripcion:
          'Guía paso a paso para mandar audios manteniendo presionado el micrófono o bloqueándolo hacia arriba, y cómo compartir fotos con nitidez.',
        duracion: '02:40',
        youtubeId: 'jNQXAC9IVRw',
        resumen:
          'Al enviar un audio largo, deslice el dedo hacia arriba sobre el candado para grabar con las manos libres sin miedo a que se corte.',
        orden: 2,
      },
      {
        id: 'cap-03',
        slug: 'identificar-estafas-whatsapp',
        titulo: 'Cápsula #3: Cómo identificar un mensaje o enlace de estafa en WhatsApp',
        descripcion:
          'Aprende las 3 señales críticas de un mensaje fraudulento y qué hacer de inmediato para proteger tus cuentas.',
        duracion: '02:45',
        youtubeId: 'kJQP7kiw5Fk',
        resumen:
          'Recuerde la regla de oro: Ningún banco o entidad solicita contraseñas por WhatsApp. Si un mensaje genera urgencia extrema, no abra el enlace y consulte primero con su tutor de LDDIGITALCO.',
        orden: 3,
      },
      {
        id: 'cap-04',
        slug: 'pedir-recetas-tramites-ia-voz',
        titulo: 'Cápsula #4: Cómo pedirle recetas, trámites e información a la IA con tu voz',
        descripcion:
          'Aprende a usar los asistentes de inteligencia artificial como un acompañante diario: dile lo que necesitas y te responderá con claridad.',
        duracion: '03:10',
        youtubeId: 'L_LUpnjgPso',
        resumen:
          'Hable con la IA como si hablara con una persona paciente. Pídale que le explique paso a paso cualquier trámite, receta o duda cotidiana.',
        orden: 4,
      },
    ],
  },
  {
    id: 'ruta-banca-movil-segura',
    slug: 'banca-movil-segura',
    titulo: 'Banca Móvil Segura y Trámites Digitales',
    descripcion:
      'Aprenda a realizar pagos, consultar saldos y gestionar su dinero desde el celular con total seguridad y sin riesgos.',
    nivel: 'inscripcion_completa',
    duracion_total: '08:30',
    microcapsulas: [
      {
        id: 'cap-banca-01',
        slug: 'ingreso-seguro-clave-dinamica',
        titulo: 'Cápsula #1: Ingreso seguro a la banca móvil y clave dinámica',
        descripcion: 'Configuración segura del ingreso biométrico y activación de clave dinámica.',
        duracion: '02:45',
        youtubeId: 'kJQP7kiw5Fk',
        resumen: 'Nunca comparta su clave dinámica por llamada ni mensaje de texto.',
        orden: 1,
      },
      {
        id: 'cap-banca-02',
        slug: 'transferencias-sin-riesgo',
        titulo: 'Cápsula #2: Cómo transferir dinero y verificar destinatarios sin riesgo',
        descripcion: 'Pasos para corroborar nombre, número de cuenta y montos antes de confirmar un envío.',
        duracion: '03:00',
        youtubeId: 'jNQXAC9IVRw',
        resumen: 'Siempre verifique los últimos 4 dígitos y el nombre del titular antes de enviar.',
        orden: 2,
      },
      {
        id: 'cap-banca-03',
        slug: 'bloqueo-preventivo-alertas',
        titulo: 'Cápsula #3: Alertas de transacciones y bloqueo preventivo de tarjetas',
        descripcion: 'Cómo activar notificaciones instantáneas de compras y apagar tarjetas temporalmente.',
        duracion: '02:45',
        youtubeId: 'dQw4w9WgXcQ',
        resumen: 'Las alertas tempranas le permiten detectar cualquier movimiento extraño en segundos.',
        orden: 3,
      },
    ],
  },
  {
    id: 'ruta-ia-practica-productividad',
    slug: 'ia-practica-productividad',
    titulo: 'Inteligencia Artificial y Automatización Práctica',
    descripcion:
      'Domine el uso de agentes de IA y herramientas generativas para redactar documentos, automatizar tareas repetitivas y acelerar su trabajo diario.',
    nivel: 'inscripcion_completa',
    duracion_total: '12:30',
    microcapsulas: [
      {
        id: 'cap-ia-01',
        slug: 'primeros-pasos-prompts-efectivos',
        titulo: 'Cápsula #1: Cómo redactar instrucciones claras para la IA',
        descripcion: 'Aprenda la estructura básica para obtener respuestas precisas en su primer intento.',
        duracion: '02:50',
        youtubeId: 'k7vhV9s0cZQ',
        resumen: 'Defina rol, contexto y formato esperado para maximizar la calidad de las respuestas.',
        orden: 1,
      },
      {
        id: 'cap-ia-02',
        slug: 'resumen-documentos-extensos',
        titulo: 'Cápsula #2: Resumen rápido de documentos y contratos',
        descripcion: 'Técnicas seguras para analizar textos largos sin compartir datos confidenciales.',
        duracion: '03:15',
        youtubeId: 'fJ9rUzIMcZQ',
        resumen: 'Extraiga cláusulas clave, fechas límite y obligaciones en viñetas ordenadas.',
        orden: 2,
      },
    ],
  },
];

/**
 * Adaptador en memoria para pruebas unitarias y entornos aislados sin acceso al disco
 */
export class InMemoriaRutaAdapter implements IRutaCatalogoAdapter {
  private rutas: RutaAprendizaje[];

  constructor(rutasIniciales: RutaAprendizaje[] = []) {
    this.rutas = [...rutasIniciales];
  }

  setRutas(rutas: RutaAprendizaje[]): void {
    this.rutas = [...rutas];
  }

  listarRutas(): RutaAprendizaje[] {
    return this.rutas;
  }
}

/**
 * Adaptador oficial para EmDash CMS y colecciones de contenido de Astro
 * Lee los archivos markdown generados/administrados por EmDash en src/content/rutas/
 * con fallback resiliente en entornos serverless Edge (Cloudflare Workers)
 */
export class EmDashContentAdapter implements IRutaCatalogoAdapter {
  private baseDir: string;
  private cache: RutaAprendizaje[] | null = null;

  constructor(baseDir?: string) {
    try {
      this.baseDir = baseDir || (typeof process !== 'undefined' && process.cwd ? path.resolve(process.cwd(), 'src/content/rutas') : '');
    } catch {
      this.baseDir = '';
    }
  }

  limpiarCache(): void {
    this.cache = null;
  }

  listarRutas(): RutaAprendizaje[] {
    if (this.cache) {
      return this.cache;
    }

    try {
      if (
        this.baseDir &&
        typeof fs !== 'undefined' &&
        typeof fs.existsSync === 'function' &&
        fs.existsSync(this.baseDir)
      ) {
        const files = fs.readdirSync(this.baseDir).filter((f) => f.endsWith('.md'));
        const rutas: RutaAprendizaje[] = [];

        for (const file of files) {
          const fullPath = path.join(this.baseDir, file);
          const content = fs.readFileSync(fullPath, 'utf-8');
          const slug = path.basename(file, '.md');
          const parsed = this.parseMarkdownFrontmatter(content, slug);
          if (parsed) {
            rutas.push(parsed);
          }
        }

        if (rutas.length > 0) {
          this.cache = rutas;
          return rutas;
        }
      }
    } catch {
      // En Cloudflare Workers / Edge Runtime donde node:fs no está disponible,
      // se utiliza el catálogo resiliente DEFAULT_STATIC_RUTAS sin interrumpir la ejecución.
    }

    this.cache = [...DEFAULT_STATIC_RUTAS];
    return this.cache;
  }

  private parseMarkdownFrontmatter(raw: string, fallbackSlug: string): RutaAprendizaje | null {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return null;

    const yamlText = match[1];
    const lines = yamlText.split(/\r?\n/);

    let id = `ruta-${fallbackSlug}`;
    let titulo = fallbackSlug;
    let descripcion = '';
    let nivel: 'ruta_abierta' | 'inscripcion_completa' = 'ruta_abierta';
    let duracion_total = '10:00';
    const microcapsulas: Microcapsula[] = [];

    let insideMicrocapsulas = false;
    let currentCap: Partial<Microcapsula> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('id:') && !insideMicrocapsulas) {
        id = trimmed.replace(/^id:\s*["']?/, '').replace(/["']?$/, '');
      } else if (trimmed.startsWith('titulo:') && !insideMicrocapsulas) {
        titulo = trimmed.replace(/^titulo:\s*["']?/, '').replace(/["']?$/, '');
      } else if (trimmed.startsWith('descripcion:') && !insideMicrocapsulas) {
        descripcion = trimmed.replace(/^descripcion:\s*["']?/, '').replace(/["']?$/, '');
      } else if (trimmed.startsWith('nivel:') && !insideMicrocapsulas) {
        const n = trimmed.replace(/^nivel:\s*["']?/, '').replace(/["']?$/, '');
        if (n === 'inscripcion_completa') nivel = 'inscripcion_completa';
      } else if (trimmed.startsWith('duracion_total:') && !insideMicrocapsulas) {
        duracion_total = trimmed.replace(/^duracion_total:\s*["']?/, '').replace(/["']?$/, '');
      } else if (trimmed.startsWith('microcapsulas:')) {
        insideMicrocapsulas = true;
      } else if (insideMicrocapsulas) {
        if (trimmed.startsWith('- id:')) {
          if (currentCap && currentCap.slug) {
            microcapsulas.push(currentCap as Microcapsula);
          }
          currentCap = {
            id: trimmed.replace(/^- id:\s*["']?/, '').replace(/["']?$/, ''),
            orden: microcapsulas.length + 1,
          };
        } else if (currentCap) {
          if (trimmed.startsWith('slug:')) {
            currentCap.slug = trimmed.replace(/^slug:\s*["']?/, '').replace(/["']?$/, '');
          } else if (trimmed.startsWith('titulo:')) {
            currentCap.titulo = trimmed.replace(/^titulo:\s*["']?/, '').replace(/["']?$/, '');
          } else if (trimmed.startsWith('descripcion:')) {
            currentCap.descripcion = trimmed.replace(/^descripcion:\s*["']?/, '').replace(/["']?$/, '');
          } else if (trimmed.startsWith('duracion:')) {
            currentCap.duracion = trimmed.replace(/^duracion:\s*["']?/, '').replace(/["']?$/, '');
          } else if (trimmed.startsWith('youtubeId:')) {
            currentCap.youtubeId = trimmed.replace(/^youtubeId:\s*["']?/, '').replace(/["']?$/, '');
          } else if (trimmed.startsWith('resumen:')) {
            currentCap.resumen = trimmed.replace(/^resumen:\s*["']?/, '').replace(/["']?$/, '');
          } else if (trimmed.startsWith('orden:')) {
            currentCap.orden = parseInt(trimmed.replace(/^orden:\s*/, ''), 10) || microcapsulas.length + 1;
          }
        }
      }
    }

    if (currentCap && currentCap.slug) {
      microcapsulas.push(currentCap as Microcapsula);
    }

    return {
      id,
      slug: fallbackSlug,
      titulo,
      descripcion,
      nivel,
      duracion_total,
      microcapsulas,
    };
  }
}
