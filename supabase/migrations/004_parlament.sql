-- AyuntamentIA — Fase 5: Parlament de Catalunya
-- Sesiones plenarias, comisiones y diari de sessions (DSPC).

CREATE TABLE IF NOT EXISTS sesiones_parlament (
    id              SERIAL PRIMARY KEY,
    external_id     VARCHAR(50) UNIQUE,
    legislatura     VARCHAR(20),
    tipo            VARCHAR(30),  -- 'pleno','comision','diputacio_permanent'
    comision        VARCHAR(100),
    titulo          TEXT,
    fecha           DATE NOT NULL,
    url_dspc        TEXT,         -- URL al PDF DSPC
    url_video       TEXT,
    storage_path    TEXT,
    file_hash       VARCHAR(64),
    texto           TEXT,
    status          VARCHAR(30) DEFAULT 'discovered',
    error_message   TEXT,
    retry_count     INTEGER DEFAULT 0,
    discovered_at   TIMESTAMPTZ DEFAULT NOW(),
    structured_at   TIMESTAMPTZ
);
CREATE INDEX idx_sesiones_parlament_fecha ON sesiones_parlament(fecha DESC);
CREATE INDEX idx_sesiones_parlament_status ON sesiones_parlament(status);
CREATE INDEX idx_sesiones_parlament_tipo ON sesiones_parlament(tipo);

-- Reusamos puntos_pleno con discriminador
ALTER TABLE puntos_pleno ADD COLUMN IF NOT EXISTS nivel VARCHAR(20) DEFAULT 'municipal';
ALTER TABLE puntos_pleno ADD COLUMN IF NOT EXISTS sesion_parlament_id INTEGER REFERENCES sesiones_parlament(id) ON DELETE CASCADE;
ALTER TABLE puntos_pleno ADD COLUMN IF NOT EXISTS partido_proponente VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_puntos_nivel ON puntos_pleno(nivel);
CREATE INDEX IF NOT EXISTS idx_puntos_sesion_parl ON puntos_pleno(sesion_parlament_id) WHERE sesion_parlament_id IS NOT NULL;

-- Vista contradicciones rival: discurso parlamentario vs voto municipal
CREATE OR REPLACE VIEW v_contradicciones_rival AS
SELECT
    pp.tema,
    pp.partido_proponente AS partido_parlament,
    COUNT(*) FILTER (WHERE pm.resultado = 'rechazada') AS rechazadas_municipal,
    COUNT(*) FILTER (WHERE pm.resultado = 'aprobada') AS aprobadas_municipal,
    COUNT(*) AS total_apariciones
FROM puntos_pleno pp
LEFT JOIN puntos_pleno pm
    ON pm.tema = pp.tema AND pm.nivel = 'municipal'
    AND pm.fecha BETWEEN pp.fecha - INTERVAL '180 days' AND pp.fecha + INTERVAL '180 days'
WHERE pp.nivel = 'parlament' AND pp.partido_proponente IS NOT NULL
GROUP BY pp.tema, pp.partido_proponente
HAVING COUNT(*) FILTER (WHERE pm.resultado = 'rechazada') > 0
ORDER BY rechazadas_municipal DESC;
