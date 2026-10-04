-- Migración D1: Tabla de Consultas Formativas al Tutor
-- 0003_consultas.sql

CREATE TABLE IF NOT EXISTS consultas (
  id TEXT PRIMARY KEY,
  estudiante_id TEXT NOT NULL,
  microcapsula_slug TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  creado_en TEXT NOT NULL,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consultas_estudiante ON consultas(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_consultas_slug ON consultas(microcapsula_slug);
