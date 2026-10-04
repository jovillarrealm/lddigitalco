// LDDIGITALCO — Definición y Validación de Colecciones de Contenido (ADR 0002 & ADR 0007)
// Integración de EmDash CMS y Astro Content Collections con Zod

import { defineCollection, z } from 'astro:content';

export const microcapsulaSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
  duracion: z.string(),
  youtubeId: z.string(),
  resumen: z.string(),
  orden: z.number().default(1),
});

export const rutasCollection = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    titulo: z.string(),
    descripcion: z.string(),
    nivel: z.enum(['ruta_abierta', 'inscripcion_completa']).default('ruta_abierta'),
    duracion_total: z.string(),
    microcapsulas: z.array(microcapsulaSchema).default([]),
  }),
});

export const collections = {
  rutas: rutasCollection,
};
