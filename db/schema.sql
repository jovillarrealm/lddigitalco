-- Esquema D1 de Base de Datos para LDDIGITALCO
-- Tabla: estudiantes

CREATE TABLE IF NOT EXISTS estudiantes (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'estudiante',
  nivel_acceso TEXT NOT NULL DEFAULT 'ruta_abierta',
  creado_en TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_estudiantes_email ON estudiantes(email);

-- Tabla: progreso (Registro de Microcápsulas Completadas)

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

-- Tabla: consultas (Consultas Formativas de Estudiantes al Tutor)

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
