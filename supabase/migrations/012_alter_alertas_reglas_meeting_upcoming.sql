-- ============================================
-- Migration 012: alertas_reglas — soporte MVP para reuniones próximas
-- ============================================
-- Semántica MVP esperada:
--   · tipo_regla = 'meeting_upcoming'
--   · severidad  = 'alta'
--   · special_channel = 'dashboard'
-- Nota: no se fuerza por constraints para mantener retrocompatibilidad total.

ALTER TABLE alertas_reglas
    ADD COLUMN IF NOT EXISTS tipo_regla TEXT,
    ADD COLUMN IF NOT EXISTS meeting_title TEXT,
    ADD COLUMN IF NOT EXISTS meeting_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS special_channel TEXT;

-- Reutilizar referencia municipal existente: esta tabla ya dispone de `municipios INTEGER[]`.
-- No se añade municipio_id para evitar duplicar semántica/FK en esta iteración MVP.

COMMENT ON COLUMN alertas_reglas.tipo_regla IS
  'Discriminador de regla. Para reunión próxima en MVP usar meeting_upcoming.';
COMMENT ON COLUMN alertas_reglas.special_channel IS
  'Canal especial opcional para UI. Para reunión próxima en MVP usar dashboard.';

CREATE INDEX IF NOT EXISTS idx_alertas_reglas_user_tipo_meeting_at
  ON alertas_reglas(user_id, tipo_regla, meeting_at)
  WHERE tipo_regla IS NOT NULL;
