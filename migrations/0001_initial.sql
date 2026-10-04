-- Migración Inicial D1: Tabla de Estudiantes
-- 0001_initial.sql

CREATE TABLE IF NOT EXISTS estudiantes (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'estudiante',
  nivel_acceso TEXT NOT NULL DEFAULT 'ruta_abierta',
  creado_en TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_estudiantes_email ON estudiantes(email);
