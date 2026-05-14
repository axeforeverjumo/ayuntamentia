-- ============================================
-- Migration 013: configuración auditable de trending_score
-- ============================================
-- Se reutiliza `alertas_reglas` como tabla administrativa existente para guardar
-- la configuración editorial manual del trending_score sin crear tablas nuevas.
-- Evidencia del patrón reutilizable:
--   · Es una tabla administrativa ya existente del sistema.
--   · Tiene timestamps de auditoría (`created_at`, `updated_at`).
--   · Ya fue extendida en la migración 012 para otro caso MVP sin duplicar modelo.

ALTER TABLE alertas_reglas
    ADD COLUMN IF NOT EXISTS trending_config_json JSONB,
    ADD COLUMN IF NOT EXISTS trending_config_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS trending_config_updated_by TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'alertas_reglas_trending_config_json_check'
    ) THEN
        ALTER TABLE alertas_reglas
            ADD CONSTRAINT alertas_reglas_trending_config_json_check
            CHECK (
                trending_config_json IS NULL
                OR (
                    jsonb_typeof(trending_config_json) = 'object'
                    AND trending_config_json ? 'weights'
                    AND jsonb_typeof(trending_config_json->'weights') = 'object'
                    AND trending_config_json ? 'penalties'
                    AND jsonb_typeof(trending_config_json->'penalties') = 'object'
                    AND (trending_config_json->'penalties') ? 'default'
                )
            );
    END IF;
END $$;

COMMENT ON COLUMN alertas_reglas.trending_config_json IS
  'Configuración canónica manual del trending_score. JSON esperado: {"weights":{"delta_plens":0.6,"score_premsa":0.4,"score_xarxes":0.0},"penalties":{"Hisenda":0.30,"RRHH":0.40,"Urbanisme rutinari":0.50,"default":0.80}}. Debe incluir weights y penalties.default.';
COMMENT ON COLUMN alertas_reglas.trending_config_updated_at IS
  'Fecha/hora de la última edición manual de trending_score.';
COMMENT ON COLUMN alertas_reglas.trending_config_updated_by IS
  'Identificador textual del administrador que editó manualmente trending_score.';

WITH global_rule AS (
    SELECT id
    FROM alertas_reglas
    ORDER BY id
    LIMIT 1
)
UPDATE alertas_reglas ar
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
FROM global_rule
WHERE ar.id = global_rule.id
  AND ar.trending_config_json IS NULL;
