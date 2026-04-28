-- Reescriu v_ranking_concejales perquè cada regidor vegi els vots del seu partit
-- al seu municipi (no només "el primer regidor del partit"). Normalitza alies
-- de partits (AC ↔ ALIANÇA.CAT, JxCat ↔ JUNTS, ERC ↔ ERC-AM, PSC ↔ PSC-CP, ...).
--
-- Limitació coneguda: les actes registren el sentit del vot a nivell de partit,
-- no per regidor individual. Per tant, mentre no extraguem vots nominals, tots
-- els regidors d'un mateix partit comparteixen el mateix sentit i la divergència
-- queda a 0 (pct_alineacion = 100). Quan tinguem vots per regidor, podrem reusar
-- el mateix esquema afegint un override per cargo_electo_id.

DROP VIEW IF EXISTS v_ranking_concejales CASCADE;

CREATE OR REPLACE FUNCTION _party_key(p TEXT) RETURNS TEXT AS $$
  SELECT CASE
    WHEN p IS NULL OR btrim(p) = '' THEN NULL
    WHEN UPPER(p) LIKE '%ALIAN%' OR UPPER(p) IN ('AC','AC-AM','AC-ARA PL','AC-PSC-CP','CXAC - CP','SAC - C') THEN 'AC'
    WHEN UPPER(p) LIKE '%JUNTS%' OR UPPER(p) LIKE 'JX%' OR UPPER(p) LIKE '%JXCAT%' THEN 'JXCAT'
    WHEN UPPER(p) LIKE 'ERC%' OR UPPER(p) LIKE '%-ERC%' OR UPPER(p) LIKE '% ERC%' THEN 'ERC'
    WHEN UPPER(p) LIKE 'PSC%' OR UPPER(p) LIKE '%-PSC%' THEN 'PSC'
    WHEN UPPER(p) LIKE 'CUP%' THEN 'CUP'
    WHEN UPPER(p) = 'PP' OR UPPER(p) LIKE 'PP-%' OR UPPER(p) LIKE 'PP %' OR UPPER(p) LIKE '%-PP%' THEN 'PP'
    WHEN UPPER(p) = 'VOX' OR UPPER(p) LIKE 'VOX %' THEN 'VOX'
    WHEN UPPER(p) LIKE '%COMU%' OR UPPER(p) LIKE 'ECP%' OR UPPER(p) LIKE 'ECG%' OR UPPER(p) LIKE 'EN COMU%' THEN 'COMUNS'
    WHEN UPPER(p) LIKE '%CIUTADANS%' OR UPPER(p) = 'CS' OR UPPER(p) LIKE 'CS-%' THEN 'CS'
    WHEN UPPER(p) LIKE '%PRIMARIES%' OR UPPER(p) LIKE '%PRIMÀRIES%' THEN 'PRIMARIES'
    ELSE UPPER(btrim(p))
  END;
$$ LANGUAGE SQL IMMUTABLE;

CREATE VIEW v_ranking_concejales AS
WITH votos_norm AS (
  SELECT v.punto_id, v.sentido, _party_key(v.partido) AS pkey, pp.municipio_id
  FROM votaciones v
  JOIN puntos_pleno pp ON pp.id = v.punto_id
  WHERE _party_key(v.partido) IS NOT NULL
),
muni_party_votes AS (
  SELECT municipio_id, pkey,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE sentido = 'a_favor') AS a_favor,
         COUNT(*) FILTER (WHERE sentido = 'en_contra') AS en_contra,
         COUNT(*) FILTER (WHERE sentido = 'abstencion') AS abstencion
  FROM votos_norm
  GROUP BY 1, 2
),
cargos AS (
  SELECT c.id AS cargo_id, c.nombre, c.cargo, c.partido,
         c.municipio_id, _party_key(c.partido) AS pkey
  FROM cargos_electos c
  WHERE c.activo = true
)
SELECT cargos.cargo_id,
       cargos.nombre,
       cargos.cargo,
       cargos.partido,
       cargos.municipio_id,
       m.nombre AS municipio,
       m.comarca,
       COALESCE(mpv.total, 0) AS votos_total,
       COALESCE(mpv.total, 0) AS coincidentes,
       0 AS divergencias,
       CASE WHEN COALESCE(mpv.total, 0) > 0 THEN 100.0 ELSE NULL END::numeric AS pct_alineacion,
       COALESCE(mpv.a_favor, 0) AS vots_a_favor,
       COALESCE(mpv.en_contra, 0) AS vots_en_contra,
       COALESCE(mpv.abstencion, 0) AS vots_abstencion
FROM cargos
JOIN municipios m ON m.id = cargos.municipio_id
LEFT JOIN muni_party_votes mpv
       ON mpv.municipio_id = cargos.municipio_id
      AND mpv.pkey = cargos.pkey;
