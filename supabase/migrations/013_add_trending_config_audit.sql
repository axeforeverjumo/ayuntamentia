-- ============================================
-- Migration 013: configuración auditable de trending_score
-- ============================================
-- Se reutiliza `alertas_reglas` como tabla administrativa existente para guardar
-- la configuración editorial manual del trending_score sin crear tablas nuevas.

ALTER TABLE alertas_reglas
    ADD COLUMN IF NOT EXISTS trending_config_json JSONB,
    ADD COLUMN IF NOT EXISTS trending_config_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS trending_config_updated_by TEXT;

COMMENT ON COLUMN alertas_reglas.trending_config_json IS
  'Configuración canónica manual del trending_score. JSON esperado: {"weights":{"delta_plens":0.6,"score_premsa":0.4,"score_xarxes":0.0},"penalties":{"Hisenda":0.30,"RRHH":0.40,"Urbanisme rutinari":0.50,"default":0.80}}. Debe incluir weights y penalties.default.';

UPDATE alertas_reglas
SET trending_config_json = jsonb_build_object(
        'weights', jsonb_build_object(
            'delta_plens', 0.6,
            'score_premsa', 0.4,
            'score_xarxes', 0.0
        ),
        'penalties', jsonb_build_object(
            'Hisenda', 0.30,
            'RRHH', 0.40,
            'Urbanisme rutinari', 0.50,
            'default', 0.80
        )
    ),
    trending_config_updated_at = NOW(),
    trending_config_updated_by = 'Juan'
WHERE id = (
    SELECT id
    FROM alertas_reglas
    ORDER BY id
    LIMIT 1
)
AND trending_config_json IS NULL;
