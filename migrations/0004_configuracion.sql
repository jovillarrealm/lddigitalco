-- Migration: 0004_configuracion.sql
-- Tabla: configuracion (Almacenamiento Clave-Valor para Estado y Configuraciones en Borde)

CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  actualizado_en TEXT NOT NULL
);
