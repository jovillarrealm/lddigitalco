-- Migración D1: Tabla de Progreso Formativo
-- 0002_progress.sql

CREATE TABLE IF NOT EXISTS progreso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  estudiante_id TEXT NOT NULL,
  microcapsula_slug TEXT NOT NULL,
  completado_en TEXT NOT NULL,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
  UNIQUE (estudiante_id, microcapsula_slug)
);

CREATE INDEX IF NOT EXISTS idx_progreso_estudiante ON progreso(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_progreso_slug ON progreso(microcapsula_slug);
