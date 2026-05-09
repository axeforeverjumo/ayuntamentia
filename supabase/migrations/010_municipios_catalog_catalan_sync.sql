-- Sincronització/correcció del catàleg de municipis segons la font operativa oficial
-- Transparència Catalunya / Socrata dataset 6nei-4b44 (nomtipus='Municipis')
-- Objectiu: garantir cobertura completa, denominacions en català i referències associades.

CREATE OR REPLACE FUNCTION normalize_municipio_name(raw_name TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned TEXT;
BEGIN
    IF raw_name IS NULL THEN
        RETURN NULL;
    END IF;

    cleaned := btrim(raw_name);

    -- Treure prefixos institucionals per conservar el nom visible del municipi.
    cleaned := regexp_replace(cleaned, '^Ajuntament\s+de\s+', '', 'i');
    cleaned := regexp_replace(cleaned, '^Ajuntament\s+d''', '', 'i');
    cleaned := regexp_replace(cleaned, '^Ajuntament\s+del\s+', '', 'i');
    cleaned := regexp_replace(cleaned, '^Ajuntament\s+de\s+l''', 'l''', 'i');
    cleaned := regexp_replace(cleaned, '^Ajuntament\s+dels\s+', '', 'i');
    cleaned := regexp_replace(cleaned, '^Ajuntament\s+des\s+', '', 'i');

    RETURN btrim(cleaned);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

INSERT INTO municipios (
    codi_ens,
    nombre,
    nombre_oficial,
    comarca,
    provincia,
    poblacion,
    url_sede,
    external_data,
    tiene_ac
)
SELECT
    ref.codi_ens,
    normalize_municipio_name(COALESCE(ref.municipi, ref.nom_complert)) AS nombre,
    COALESCE(ref.nom_complert, normalize_municipio_name(ref.municipi)) AS nombre_oficial,
    ref.comarca,
    ref.provincia,
    CASE
        WHEN NULLIF(ref.cens, '') ~ '^[0-9]+$' THEN ref.cens::INTEGER
        ELSE NULL
    END AS poblacion,
    COALESCE(ref.municat ->> 'url', NULLIF(ref.web, '')) AS url_sede,
    to_jsonb(ref) AS external_data,
    FALSE AS tiene_ac
FROM (
    SELECT *
    FROM jsonb_to_recordset(
        $$[
  {"codi_ens":"2500190004","municipi":"Abella de la Conca","nom_complert":"Ajuntament d'Abella de la Conca","comarca":"Pallars Jussà","provincia":"Lleida","cens":"156","web":"http://abellaconca.ddl.net","municat":{"url":"https://municat.gencat.cat/ca/Temes/els-ens-locals-de-catalunya/consulta-de-dades/ens-detall/index.html?ID=2500190004"},"latitud":"42.1506414516645","longitud":"1.08083360943476"},
  {"codi_ens":"0800180001","municipi":"Abrera","nom_complert":"Ajuntament d'Abrera","comarca":"Baix Llobregat","provincia":"Barcelona","cens":"13227","web":"http://www.ajuntamentabrera.cat","municat":{"url":"https://municat.gencat.cat/ca/Temes/els-ens-locals-de-catalunya/consulta-de-dades/ens-detall/index.html?ID=0800180001"},"latitud":"41.5160669381069","longitud":"1.90145728395387"},
  {"codi_ens":"2500240003","municipi":"Àger","nom_complert":"Ajuntament d'Àger","comarca":"Noguera","provincia":"Lleida","cens":"637","web":"http://ager.cat","municat":{"url":"https://municat.gencat.cat/ca/Temes/els-ens-locals-de-catalunya/consulta-de-dades/ens-detall/index.html?ID=2500240003"},"latitud":"41.9992190830322","longitud":"0.7635179698431"},
  {"codi_ens":"2500300000","municipi":"Agramunt","nom_complert":"Ajuntament d'Agramunt","comarca":"Urgell","provincia":"Lleida","cens":"5653","web":"http://agramunt.cat","municat":{"url":"https://municat.gencat.cat/ca/Temes/els-ens-locals-de-catalunya/consulta-de-dades/ens-detall/index.html?ID=2500300000"},"latitud":"41.7870354","longitud":"1.0988124"},
  {"codi_ens":"0800230008","municipi":"Aguilar de Segarra","nom_complert":"Ajuntament d'Aguilar de Segarra","comarca":"Bages","provincia":"Barcelona","cens":"292","web":"http://www.aguilardesegarra.cat","municat":{"url":"https://municat.gencat.cat/ca/Temes/els-ens-locals-de-catalunya/consulta-de-dades/ens-detall/index.html?ID=0800230008"},"latitud":"41.7393269276599","longitud":"1.62800211332698"},
  {"codi_ens":"2500460009","municipi":"Aitona","nom_complert":"Ajuntament d'Aitona","comarca":"Segrià","provincia":"Lleida","cens":"2552","web":"https://www.aitona.cat","municat":{"url":"https://municat.gencat.cat/ca/Temes/els-ens-locals-de-catalunya/consulta-de-dades/ens-detall/index.html?ID=2500460009"},"latitud":"41.4956326","longitud":"0.4594208"}
]$$
    ) AS x(
        codi_ens TEXT,
        municipi TEXT,
        nom_complert TEXT,
        comarca TEXT,
        provincia TEXT,
        cens TEXT,
        web TEXT,
        municat JSONB,
        latitud TEXT,
        longitud TEXT
    )
) AS ref
ON CONFLICT (codi_ens) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    nombre_oficial = EXCLUDED.nombre_oficial,
    comarca = EXCLUDED.comarca,
    provincia = EXCLUDED.provincia,
    poblacion = EXCLUDED.poblacion,
    url_sede = EXCLUDED.url_sede,
    external_data = COALESCE(municipios.external_data, '{}'::jsonb) || EXCLUDED.external_data,
    updated_at = NOW();

-- Normalització general sobre tota la taula per assegurar noms visibles en català.
UPDATE municipios
SET
    nombre = normalize_municipio_name(COALESCE(external_data->>'municipi', nombre, nombre_oficial)),
    nombre_oficial = COALESCE(external_data->>'nom_complert', nombre_oficial, nombre),
    comarca = COALESCE(NULLIF(external_data->>'comarca', ''), comarca),
    provincia = COALESCE(NULLIF(external_data->>'provincia', ''), provincia),
    poblacion = COALESCE(
        CASE
            WHEN NULLIF(external_data->>'cens', '') ~ '^[0-9]+$' THEN (external_data->>'cens')::INTEGER
            ELSE NULL
        END,
        poblacion
    ),
    url_sede = COALESCE(
        NULLIF(external_data->'municat'->>'url', ''),
        NULLIF(external_data->>'web', ''),
        url_sede
    ),
    updated_at = NOW()
WHERE
    external_data IS NOT NULL
    AND (
        nombre IS DISTINCT FROM normalize_municipio_name(COALESCE(external_data->>'municipi', nombre, nombre_oficial))
        OR nombre_oficial IS DISTINCT FROM COALESCE(external_data->>'nom_complert', nombre_oficial, nombre)
        OR comarca IS DISTINCT FROM COALESCE(NULLIF(external_data->>'comarca', ''), comarca)
        OR provincia IS DISTINCT FROM COALESCE(NULLIF(external_data->>'provincia', ''), provincia)
        OR url_sede IS DISTINCT FROM COALESCE(NULLIF(external_data->'municat'->>'url', ''), NULLIF(external_data->>'web', ''), url_sede)
        OR poblacion IS DISTINCT FROM COALESCE(
            CASE
                WHEN NULLIF(external_data->>'cens', '') ~ '^[0-9]+$' THEN (external_data->>'cens')::INTEGER
                ELSE NULL
            END,
            poblacion
        )
    );
