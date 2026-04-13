-- AyuntamentIA — Fase 1: Auth, RBAC, Audit Log
-- Depende de Supabase Auth (auth.users existe ya en el schema 'auth')

-- ============================================
-- ROLES
-- ============================================
-- Roles disponibles:
--   admin      → acceso total + panel admin + audit log
--   direccion  → acceso total a todos los municipios y áreas
--   delegado   → acceso solo a áreas/municipios asignados
--   concejal   → acceso solo a su propio municipio

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre          VARCHAR(200) NOT NULL,
    rol             VARCHAR(20) NOT NULL CHECK (rol IN ('admin','direccion','delegado','concejal')),
    activo          BOOLEAN DEFAULT TRUE,
    anonimizar_nombres BOOLEAN DEFAULT FALSE,  -- modo RGPD: ofuscar particulares
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_profiles_rol ON user_profiles(rol);

-- Áreas temáticas asignadas a un usuario (delegado/concejal)
CREATE TABLE IF NOT EXISTS user_areas (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    area            VARCHAR(50) NOT NULL,  -- 'medio_ambiente','comercio','pesca','agricultura','caza','urbanismo','seguridad','servicios_sociales',...
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, area)
);
CREATE INDEX idx_user_areas_user ON user_areas(user_id);

-- Municipios visibles para el usuario (vacío = todos, según rol)
CREATE TABLE IF NOT EXISTS user_municipios (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    municipio_id    INTEGER NOT NULL REFERENCES municipios(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, municipio_id)
);
CREATE INDEX idx_user_municipios_user ON user_municipios(user_id);

-- ============================================
-- AUDIT LOG (uso de la herramienta)
-- ============================================
CREATE TABLE IF NOT EXISTS usage_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    accion          VARCHAR(50) NOT NULL,  -- 'chat_query','search','view_acta','view_municipio','export','login'
    payload         JSONB,                  -- pregunta, filtros, etc
    response_meta   JSONB,                  -- nº resultados, tools usadas, latencia
    ip              INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_usage_log_user_time ON usage_log(user_id, created_at DESC);
CREATE INDEX idx_usage_log_accion ON usage_log(accion, created_at DESC);
CREATE INDEX idx_usage_log_time ON usage_log(created_at DESC);

-- ============================================
-- SUSCRIPCIONES A INFORMES TEMÁTICOS
-- ============================================
CREATE TABLE IF NOT EXISTS subscripciones (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    nombre          VARCHAR(200) NOT NULL,
    temas           TEXT[] NOT NULL DEFAULT '{}',
    municipios      INTEGER[] DEFAULT '{}',  -- vacío = todos los del usuario
    canal           VARCHAR(20) NOT NULL CHECK (canal IN ('email','telegram','both')),
    cron_expr       VARCHAR(50) NOT NULL DEFAULT '0 8 * * 5',  -- viernes 8am
    activo          BOOLEAN DEFAULT TRUE,
    last_sent_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subscripciones_activo ON subscripciones(activo) WHERE activo = TRUE;
CREATE INDEX idx_subscripciones_user ON subscripciones(user_id);

-- ============================================
-- RECEPCIÓN SOCIAL (Fase 3, esquema preparado)
-- ============================================
CREATE TABLE IF NOT EXISTS mencion_social (
    id              BIGSERIAL PRIMARY KEY,
    fuente          VARCHAR(20) NOT NULL,  -- 'twitter','bluesky','mastodon','prensa'
    fuente_url      TEXT,
    autor           VARCHAR(200),
    texto           TEXT NOT NULL,
    publicado_at    TIMESTAMPTZ NOT NULL,
    tema            VARCHAR(50),
    municipio_id    INTEGER REFERENCES municipios(id) ON DELETE SET NULL,
    sentiment       VARCHAR(20),  -- 'positivo','negativo','neutro'
    engagement      INTEGER DEFAULT 0,  -- likes+rt+...
    raw             JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fuente, fuente_url)
);
CREATE INDEX idx_mencion_tema_fecha ON mencion_social(tema, publicado_at DESC);
CREATE INDEX idx_mencion_municipio ON mencion_social(municipio_id, publicado_at DESC);

-- ============================================
-- VISTA: RANKING DE CONCEJALES POR ALINEACIÓN
-- ============================================
-- Mide cuánto un concejal vota igual que la línea oficial del partido.
-- Se calcula como % de votos coincidentes con el modo del partido en cada punto.
CREATE OR REPLACE VIEW v_ranking_concejales AS
WITH voto_partido AS (
    SELECT
        v.punto_id,
        v.partido,
        MODE() WITHIN GROUP (ORDER BY v.sentido) AS sentido_partido,
        COUNT(*) AS n_votos
    FROM votaciones v
    GROUP BY v.punto_id, v.partido
    HAVING COUNT(*) >= 2
),
alineacion AS (
    SELECT
        v.cargo_electo_id,
        v.partido,
        COUNT(*) FILTER (WHERE v.sentido = vp.sentido_partido) AS coincidentes,
        COUNT(*) AS total
    FROM votaciones v
    JOIN voto_partido vp USING (punto_id, partido)
    WHERE v.cargo_electo_id IS NOT NULL
    GROUP BY v.cargo_electo_id, v.partido
)
SELECT
    c.id           AS cargo_id,
    c.nombre,
    c.cargo,
    c.partido,
    c.municipio_id,
    m.nombre       AS municipio,
    m.comarca,
    a.total        AS votos_total,
    a.coincidentes,
    ROUND(100.0 * a.coincidentes / NULLIF(a.total, 0), 1) AS pct_alineacion,
    a.total - a.coincidentes AS divergencias
FROM cargos_electos c
JOIN alineacion a ON a.cargo_electo_id = c.id
JOIN municipios m ON m.id = c.municipio_id
WHERE c.activo = TRUE;

-- ============================================
-- VISTA: TENDENCIAS EMERGENTES (Fase 4 base)
-- ============================================
-- Temas que crecen en los últimos 30 días vs los 30 anteriores.
CREATE OR REPLACE VIEW v_tendencias_emergentes AS
WITH ventana_actual AS (
    SELECT tema, COUNT(*) AS n
    FROM puntos_pleno
    WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY tema
),
ventana_previa AS (
    SELECT tema, COUNT(*) AS n
    FROM puntos_pleno
    WHERE fecha BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days'
    GROUP BY tema
)
SELECT
    a.tema,
    a.n          AS actual,
    COALESCE(p.n, 0) AS previo,
    a.n - COALESCE(p.n, 0) AS delta,
    CASE WHEN COALESCE(p.n, 0) = 0 THEN NULL
         ELSE ROUND(100.0 * (a.n - p.n) / p.n, 1)
    END AS pct_crecimiento
FROM ventana_actual a
LEFT JOIN ventana_previa p ON p.tema = a.tema
WHERE a.n >= 5
ORDER BY delta DESC;

-- ============================================
-- TRIGGERS updated_at
-- ============================================
DROP TRIGGER IF EXISTS tr_user_profiles_updated ON user_profiles;
CREATE TRIGGER tr_user_profiles_updated BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_subscripciones_updated ON subscripciones;
CREATE TRIGGER tr_subscripciones_updated BEFORE UPDATE ON subscripciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
