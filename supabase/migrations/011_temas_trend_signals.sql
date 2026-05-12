-- Tabla per a senyals mediàtics per tema (prensa, xarxes, altres canals).
-- Alimentada per pipeline d'agregació de mitjans externs; per defecte buida.
CREATE TABLE IF NOT EXISTS temas_trend_signals (
    tema                       TEXT PRIMARY KEY,
    nivel_mediatico_prensa     NUMERIC DEFAULT 0,
    nivel_mediatico_redes      NUMERIC DEFAULT 0,
    nivel_mediatico_otras      NUMERIC DEFAULT 0,
    updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_temas_trend_signals_updated_at
    ON temas_trend_signals(updated_at DESC);
