// Interfaces compatibles con Cloudflare D1

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    served_by?: string;
  };
  error?: string;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = Record<string, any>>(colName?: string): Promise<T | null>;
  run<T = Record<string, any>>(): Promise<D1Result<T>>;
  all<T = Record<string, any>>(): Promise<D1Result<T>>;
  raw<T = any[]>(): Promise<T[]>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface Estudiante {
  id: string;
  email: string;
  nombre: string;
  rol: 'estudiante' | 'tutor' | 'admin';
  nivel_acceso: 'ruta_abierta' | 'inscripcion_completa';
  creado_en: string;
}

export interface Progreso {
  id: number;
  estudiante_id: string;
  microcapsula_slug: string;
  completado_en: string;
}

export interface Consulta {
  id: string;
  estudiante_id: string;
  microcapsula_slug: string;
  mensaje: string;
  estado: 'pendiente' | 'respondida' | 'archivada' | string;
  creado_en: string;
}

