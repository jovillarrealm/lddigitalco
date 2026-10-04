export interface Microcapsula {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string;
  duracion: string;
  youtubeId: string;
  resumen: string;
  orden: number;
}

export interface RutaAprendizaje {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string;
  nivel: 'ruta_abierta' | 'inscripcion_completa';
  duracion_total: string;
  microcapsulas: Microcapsula[];
}

export interface RouteProgressSummary {
  ruta: string;
  total: number;
  completadas: number;
  porcentaje: number;
  completadasSlugs: string[];
}
