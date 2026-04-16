-- ============================================
-- Migration 008: alertas_reglas — reglas personalizadas de alerta
-- ============================================
-- Cada regla es una vigilancia activa definida por el usuario. El worker las
-- evalúa periódicamente y crea filas en `alertas` cuando detecta coincidencias
-- en actas/argumentos/votaciones nuevas desde last_run_at.
--
-- Combinaciones soportadas:
--   · Solo partido: "cualquier cosa que diga/haga el PP"
--   · Solo tema: "todo sobre civismo/inmigración"
--   · Partido + tema: "el PSC sobre inmigración"
--   · Concejales: "Sílvia Orriols"
--   · Palabras clave: "títol falso", "nepotismo"
--   · Municipios: limita a una lista de municipio_ids
--   · Combinación libre (AND entre campos, OR dentro de listas)

CREATE TABLE IF NOT EXISTS alertas_reglas (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    nombre          VARCHAR(200) NOT NULL,
    descripcion     TEXT,

    -- Filtros (todos opcionales, se combinan con AND)
    partidos        TEXT[] DEFAULT '{}',       -- ['PP', 'PSC'] → cualquiera de estos
    temas           TEXT[] DEFAULT '{}',       -- ['civismo', 'inmigración']
    concejales      TEXT[] DEFAULT '{}',       -- ['Sílvia Orriols', 'Julio'] (match parcial)
    palabras_clave  TEXT[] DEFAULT '{}',       -- ['títol fals', 'mentira']
    municipios      INTEGER[] DEFAULT '{}',    -- [] = todos

    -- Dónde buscar: argumentos, puntos (resumen/título), votaciones polémicas
    fuentes         TEXT[] DEFAULT '{argumentos,puntos}',  -- argumentos | puntos | votos

    -- Configuración de alerta
    severidad       VARCHAR(20) DEFAULT 'media' CHECK (severidad IN ('alta', 'media', 'baja')),
    canal           VARCHAR(20) DEFAULT 'web' CHECK (canal IN ('web', 'email', 'telegram', 'all')),
    min_coincidencias INTEGER DEFAULT 1,       -- mínimo de coincidencias para disparar

    -- Estado
    activa          BOOLEAN DEFAULT TRUE,
    last_run_at     TIMESTAMPTZ,
    last_match_at   TIMESTAMPTZ,
    match_count     INTEGER DEFAULT 0,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alertas_reglas_activa ON alertas_reglas(activa) WHERE activa = TRUE;
CREATE INDEX IF NOT EXISTS idx_alertas_reglas_user ON alertas_reglas(user_id);

-- Relación entre alertas generadas y la regla que las disparó (opcional)
ALTER TABLE alertas ADD COLUMN IF NOT EXISTS regla_id INTEGER
    REFERENCES alertas_reglas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alertas_regla ON alertas(regla_id) WHERE regla_id IS NOT NULL;

-- Garantizar idempotencia: no crear la misma alerta 2 veces para la misma regla + punto
CREATE UNIQUE INDEX IF NOT EXISTS idx_alertas_regla_punto_unique
    ON alertas(regla_id, punto_id) WHERE regla_id IS NOT NULL AND punto_id IS NOT NULL;
