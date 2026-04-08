-- Datasets adicionales de la Generalitat

-- Elecciones municipales (votos por partido por municipio desde 1979)
CREATE TABLE IF NOT EXISTS elecciones (
    id SERIAL PRIMARY KEY,
    codi_ens VARCHAR(20),
    municipio VARCHAR(200),
    anyo INTEGER,
    partido VARCHAR(200),
    votos INTEGER,
    porcentaje NUMERIC(6,2),
    concejales INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_elecciones_codi ON elecciones(codi_ens);
CREATE INDEX idx_elecciones_anyo ON elecciones(anyo);
CREATE INDEX idx_elecciones_partido ON elecciones(partido);

-- Historial de alcaldes
CREATE TABLE IF NOT EXISTS alcaldes (
    id SERIAL PRIMARY KEY,
    codi_ens VARCHAR(20),
    municipio VARCHAR(200),
    nombre VARCHAR(200),
    partido VARCHAR(200),
    legislatura VARCHAR(50),
    fecha_posesion DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_alcaldes_codi ON alcaldes(codi_ens);
CREATE INDEX idx_alcaldes_partido ON alcaldes(partido);

-- Mociones municipales al Govern
CREATE TABLE IF NOT EXISTS mociones (
    id SERIAL PRIMARY KEY,
    titulo TEXT,
    municipio VARCHAR(200),
    vegueria VARCHAR(100),
    fecha DATE,
    tema VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_mociones_municipio ON mociones(municipio);
CREATE INDEX idx_mociones_tema ON mociones(tema);
CREATE INDEX idx_mociones_fecha ON mociones(fecha);

-- Población histórica
CREATE TABLE IF NOT EXISTS poblacion (
    id SERIAL PRIMARY KEY,
    codi_ens VARCHAR(20),
    municipio VARCHAR(200),
    anyo INTEGER,
    total INTEGER,
    hombres INTEGER,
    mujeres INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_poblacion_codi ON poblacion(codi_ens);
CREATE INDEX idx_poblacion_anyo ON poblacion(anyo);

-- Presupuestos municipales (resumen por municipio/año, no las 7.9M líneas)
CREATE TABLE IF NOT EXISTS presupuestos (
    id SERIAL PRIMARY KEY,
    codi_ens VARCHAR(20),
    municipio VARCHAR(200),
    anyo INTEGER,
    tipo VARCHAR(10),
    total NUMERIC(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_presupuestos_codi ON presupuestos(codi_ens);
CREATE INDEX idx_presupuestos_anyo ON presupuestos(anyo);

-- Iniciativas parlamentarias
CREATE TABLE IF NOT EXISTS iniciativas_parlament (
    id SERIAL PRIMARY KEY,
    legislatura VARCHAR(10),
    tipo VARCHAR(100),
    numero VARCHAR(50),
    titulo TEXT,
    proponentes TEXT,
    grupo VARCHAR(100),
    fecha DATE,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_iniciativas_tipo ON iniciativas_parlament(tipo);
CREATE INDEX idx_iniciativas_grupo ON iniciativas_parlament(grupo);
CREATE INDEX idx_iniciativas_fecha ON iniciativas_parlament(fecha);
