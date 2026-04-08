-- AyuntamentIA - Schema principal
-- Ejecutar en Supabase PostgreSQL

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- MUNICIPIOS Y CARGOS
-- ============================================

CREATE TABLE IF NOT EXISTS municipios (
    id              SERIAL PRIMARY KEY,
    codi_ens        VARCHAR(20) UNIQUE NOT NULL,
    nombre          VARCHAR(200) NOT NULL,
    nombre_oficial  VARCHAR(200),
    comarca         VARCHAR(100),
    provincia       VARCHAR(50),
    poblacion       INTEGER,
    url_sede        TEXT,
    tiene_ac        BOOLEAN DEFAULT FALSE,
    external_data   JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_municipios_codi ON municipios(codi_ens);
CREATE INDEX idx_municipios_tiene_ac ON municipios(tiene_ac) WHERE tiene_ac = TRUE;
CREATE INDEX idx_municipios_provincia ON municipios(provincia);

CREATE TABLE IF NOT EXISTS cargos_electos (
    id              SERIAL PRIMARY KEY,
    municipio_id    INTEGER REFERENCES municipios(id) ON DELETE CASCADE,
    codi_ens        VARCHAR(20),
    nombre          VARCHAR(200) NOT NULL,
    cargo           VARCHAR(100),
    partido         VARCHAR(100) NOT NULL,
    area            VARCHAR(300),
    orden           INTEGER,
    fecha_nombramiento DATE,
    activo          BOOLEAN DEFAULT TRUE,
    external_data   JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cargos_partido ON cargos_electos(partido);
CREATE INDEX idx_cargos_municipio ON cargos_electos(municipio_id);
CREATE INDEX idx_cargos_nombre ON cargos_electos USING gin(nombre gin_trgm_ops);

-- ============================================
-- ACTAS DE PLENOS
-- ============================================

CREATE TABLE IF NOT EXISTS actas (
    id              SERIAL PRIMARY KEY,
    external_id     INTEGER UNIQUE,
    municipio_id    INTEGER REFERENCES municipios(id) ON DELETE CASCADE,
    codi_ens        VARCHAR(20),
    nom_ens         VARCHAR(200),
    fecha           DATE NOT NULL,
    tipo            VARCHAR(50),
    url_pdf         TEXT NOT NULL,
    codi_acta       VARCHAR(100),
    -- Storage
    storage_path    TEXT,
    file_hash       VARCHAR(64),
    file_size       INTEGER,
    -- Texto extraido
    texto           TEXT,
    metodo_extraccion VARCHAR(20),
    num_paginas     INTEGER,
    num_caracteres  INTEGER,
    idioma          VARCHAR(10),
    -- Pipeline status
    status          VARCHAR(30) DEFAULT 'discovered',
    priority        INTEGER DEFAULT 0,
    quality_score   INTEGER DEFAULT 0,
    error_message   TEXT,
    retry_count     INTEGER DEFAULT 0,
    -- Timestamps
    discovered_at   TIMESTAMPTZ DEFAULT NOW(),
    downloaded_at   TIMESTAMPTZ,
    extracted_at    TIMESTAMPTZ,
    structured_at   TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_actas_status ON actas(status);
CREATE INDEX idx_actas_municipio ON actas(municipio_id);
CREATE INDEX idx_actas_fecha ON actas(fecha DESC);
CREATE INDEX idx_actas_priority ON actas(priority DESC, fecha DESC);
CREATE INDEX idx_actas_codi_ens ON actas(codi_ens);

-- Full-text search (catalan y español)
ALTER TABLE actas ADD COLUMN IF NOT EXISTS tsv tsvector
    GENERATED ALWAYS AS (
        to_tsvector('spanish', coalesce(texto, ''))
    ) STORED;
CREATE INDEX idx_actas_tsv ON actas USING GIN(tsv);

-- ============================================
-- DATOS ESTRUCTURADOS POR LLM
-- ============================================

CREATE TABLE IF NOT EXISTS actas_analisis (
    id              SERIAL PRIMARY KEY,
    acta_id         INTEGER REFERENCES actas(id) ON DELETE CASCADE UNIQUE,
    datos_completos JSONB NOT NULL,
    modelo_usado    VARCHAR(50),
    tokens_input    INTEGER,
    tokens_output   INTEGER,
    procesado_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS puntos_pleno (
    id              SERIAL PRIMARY KEY,
    acta_id         INTEGER REFERENCES actas(id) ON DELETE CASCADE,
    municipio_id    INTEGER REFERENCES municipios(id),
    fecha           DATE NOT NULL,
    numero          INTEGER,
    titulo          TEXT NOT NULL,
    tema            VARCHAR(100),
    subtema         VARCHAR(100),
    resultado       VARCHAR(30),
    resumen         TEXT,
    unanimidad      BOOLEAN,
    datos_extra     JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_puntos_acta ON puntos_pleno(acta_id);
CREATE INDEX idx_puntos_tema ON puntos_pleno(tema);
CREATE INDEX idx_puntos_municipio_fecha ON puntos_pleno(municipio_id, fecha DESC);
CREATE INDEX idx_puntos_resultado ON puntos_pleno(resultado);

CREATE TABLE IF NOT EXISTS votaciones (
    id              SERIAL PRIMARY KEY,
    punto_id        INTEGER REFERENCES puntos_pleno(id) ON DELETE CASCADE,
    cargo_electo_id INTEGER REFERENCES cargos_electos(id) ON DELETE SET NULL,
    nombre_raw      VARCHAR(200),
    partido         VARCHAR(100),
    sentido         VARCHAR(20) NOT NULL CHECK (sentido IN ('a_favor', 'en_contra', 'abstencion')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_votaciones_partido ON votaciones(partido);
CREATE INDEX idx_votaciones_punto ON votaciones(punto_id);
CREATE INDEX idx_votaciones_cargo ON votaciones(cargo_electo_id);
CREATE INDEX idx_votaciones_sentido ON votaciones(sentido);

CREATE TABLE IF NOT EXISTS argumentos (
    id              SERIAL PRIMARY KEY,
    punto_id        INTEGER REFERENCES puntos_pleno(id) ON DELETE CASCADE,
    partido         VARCHAR(100),
    posicion        VARCHAR(20),
    argumento       TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_argumentos_punto ON argumentos(punto_id);
CREATE INDEX idx_argumentos_partido ON argumentos(partido);

-- ============================================
-- COHERENCIA Y ALERTAS
-- ============================================

CREATE TABLE IF NOT EXISTS linea_partido (
    id              SERIAL PRIMARY KEY,
    tema            VARCHAR(100) NOT NULL,
    subtema         VARCHAR(100),
    posicion        VARCHAR(20) NOT NULL CHECK (posicion IN ('a_favor', 'en_contra', 'abstencion', 'libre')),
    descripcion     TEXT,
    keywords        TEXT[],
    vigente_desde   DATE DEFAULT CURRENT_DATE,
    vigente_hasta   DATE,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_linea_tema ON linea_partido(tema);

CREATE TABLE IF NOT EXISTS alertas (
    id              SERIAL PRIMARY KEY,
    tipo            VARCHAR(50) NOT NULL,
    severidad       VARCHAR(20) NOT NULL CHECK (severidad IN ('alta', 'media', 'baja')),
    titulo          TEXT NOT NULL,
    descripcion     TEXT NOT NULL,
    punto_id        INTEGER REFERENCES puntos_pleno(id) ON DELETE SET NULL,
    municipio_id    INTEGER REFERENCES municipios(id) ON DELETE SET NULL,
    cargo_electo_id INTEGER REFERENCES cargos_electos(id) ON DELETE SET NULL,
    puntos_comparados INTEGER[],
    contexto        JSONB,
    estado          VARCHAR(20) DEFAULT 'nueva' CHECK (estado IN ('nueva', 'vista', 'resuelta', 'descartada')),
    notificada_telegram BOOLEAN DEFAULT FALSE,
    notificada_email    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    viewed_at       TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    resolved_by     UUID
);
CREATE INDEX idx_alertas_estado ON alertas(estado, created_at DESC);
CREATE INDEX idx_alertas_tipo ON alertas(tipo);
CREATE INDEX idx_alertas_severidad ON alertas(severidad);
CREATE INDEX idx_alertas_municipio ON alertas(municipio_id);

-- ============================================
-- STATS Y MONITOREO
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_stats (
    id              SERIAL PRIMARY KEY,
    fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
    actas_descubiertas  INTEGER DEFAULT 0,
    actas_descargadas   INTEGER DEFAULT 0,
    actas_extraidas     INTEGER DEFAULT 0,
    actas_estructuradas INTEGER DEFAULT 0,
    actas_fallidas      INTEGER DEFAULT 0,
    tokens_consumidos   INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fecha)
);

-- ============================================
-- FUNCIONES UTILES
-- ============================================

-- Actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_municipios_updated BEFORE UPDATE ON municipios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_cargos_updated BEFORE UPDATE ON cargos_electos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_actas_updated BEFORE UPDATE ON actas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vista resumen para dashboard
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM municipios) as total_municipios,
    (SELECT COUNT(*) FROM municipios WHERE tiene_ac = TRUE) as municipios_ac,
    (SELECT COUNT(*) FROM actas) as total_actas,
    (SELECT COUNT(*) FROM actas WHERE status = 'structured') as actas_procesadas,
    (SELECT COUNT(*) FROM actas WHERE status = 'discovered') as actas_pendientes,
    (SELECT COUNT(*) FROM actas WHERE status LIKE 'failed%') as actas_fallidas,
    (SELECT COUNT(*) FROM puntos_pleno) as total_puntos,
    (SELECT COUNT(*) FROM votaciones) as total_votaciones,
    (SELECT COUNT(*) FROM alertas WHERE estado = 'nueva') as alertas_pendientes,
    (SELECT COUNT(*) FROM cargos_electos WHERE activo = TRUE) as cargos_activos;

-- Vista coherencia por concejal de AC
CREATE OR REPLACE VIEW coherencia_concejales AS
SELECT
    ce.id as cargo_id,
    ce.nombre,
    ce.partido,
    m.nombre as municipio,
    m.codi_ens,
    COUNT(DISTINCT v.punto_id) as total_votaciones,
    COUNT(DISTINCT a.id) as total_alertas,
    COUNT(DISTINCT a.id) FILTER (WHERE a.severidad = 'alta') as alertas_altas,
    CASE
        WHEN COUNT(DISTINCT v.punto_id) = 0 THEN 100
        ELSE ROUND(
            (1 - COUNT(DISTINCT a.id)::numeric / GREATEST(COUNT(DISTINCT v.punto_id), 1)) * 100
        )
    END as indice_coherencia
FROM cargos_electos ce
JOIN municipios m ON ce.municipio_id = m.id
LEFT JOIN votaciones v ON v.cargo_electo_id = ce.id
LEFT JOIN alertas a ON a.cargo_electo_id = ce.id AND a.estado != 'descartada'
WHERE ce.activo = TRUE
GROUP BY ce.id, ce.nombre, ce.partido, m.nombre, m.codi_ens;
