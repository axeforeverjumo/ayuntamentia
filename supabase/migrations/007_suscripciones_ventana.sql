-- Ventana temporal configurable por suscripción (default 7 días).
ALTER TABLE subscripciones ADD COLUMN IF NOT EXISTS ventana_dias INTEGER NOT NULL DEFAULT 7
    CHECK (ventana_dias BETWEEN 1 AND 365);
