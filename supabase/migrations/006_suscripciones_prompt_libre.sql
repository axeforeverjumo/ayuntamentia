-- Consulta libre en suscripciones: permite describir en lenguaje natural
-- qué se quiere vigilar (ej. "todo lo que se hable de Aliança Catalana",
-- "movimientos del PP en municipios donde gobernamos").
ALTER TABLE subscripciones ADD COLUMN IF NOT EXISTS prompt_libre TEXT;

-- Validación: o bien hay temas, o bien hay prompt_libre (o ambos).
ALTER TABLE subscripciones DROP CONSTRAINT IF EXISTS subscripciones_tema_o_prompt;
ALTER TABLE subscripciones ADD CONSTRAINT subscripciones_tema_o_prompt
    CHECK (array_length(temas, 1) > 0 OR (prompt_libre IS NOT NULL AND length(trim(prompt_libre)) > 0));
