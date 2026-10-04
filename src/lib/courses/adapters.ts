// LDDIGITALCO — Adaptadores de Contenido para el Catálogo de Rutas
// Conforma la costura de desacoplamiento entre EmDash CMS / Markdown y la lógica del LMS

import type { RutaAprendizaje, Microcapsula } from './types';
import fs from 'node:fs';
import path from 'node:path';

export interface IRutaCatalogoAdapter {
  listarRutas(): Promise<RutaAprendizaje[]> | RutaAprendizaje[];
}

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
 */
export class EmDashContentAdapter implements IRutaCatalogoAdapter {
  private baseDir: string;
  private cache: RutaAprendizaje[] | null = null;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'src/content/rutas');
  }

  limpiarCache(): void {
    this.cache = null;
  }

  listarRutas(): RutaAprendizaje[] {
    if (this.cache) {
      return this.cache;
    }

    if (!fs.existsSync(this.baseDir)) {
      return [];
    }

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

    this.cache = rutas;
    return rutas;
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
