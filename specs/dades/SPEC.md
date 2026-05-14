# SPEC — dades

## 2025-02-14 — Configuració auditable de `trending_score`

### Resum
S'ha deixat una única font de veritat per a la configuració editorial de `trending_score` reutilitzant la taula administrativa existent `alertas_reglas`, sense crear cap taula nova.

### Fitxers modificats
- `supabase/migrations/013_add_trending_config_audit.sql`
- `specs/dades/SPEC.md`
- `README.md`

### Taula reutilitzada
S'ha reutilitzat `alertas_reglas` perquè ja és una taula administrativa activa del sistema i el projecte ja segueix el patró d'estendre-la per nous casos MVP sense duplicar model, tal com ja fa `012_alter_alertas_reglas_meeting_upcoming.sql`.

Raons per no crear una taula nova:
- evita duplicar infraestructura administrativa per a configuració manual,
- conserva el patró de migracions append-only del repositori,
- permet auditoria mínima amb camps dedicats sense afectar lectures existents,
- compleix l'abast del brief: reutilitzar una taula existent.

### Columnes afegides
La migració afegeix, amb `ADD COLUMN IF NOT EXISTS`, aquestes columnes a `alertas_reglas`:
- `trending_config_json JSONB`
- `trending_config_updated_at TIMESTAMPTZ`
- `trending_config_updated_by TEXT`

També afegeix una validació SQL mínima perquè, quan `trending_config_json` no sigui `NULL`, el JSON compleixi:
- arrel tipus objecte,
- clau `weights` obligatòria i objecte,
- clau `penalties` obligatòria i objecte,
- clau `penalties.default` obligatòria.

Aquesta restricció és retrocompatible perquè no obliga cap valor sobre files antigues mentre el camp continuï a `NULL`.

### JSON esperat
Exemple canònic documentat i carregat inicialment:

```json
{
  "weights": {
    "delta_plens": 0.6,
    "score_premsa": 0.4,
    "score_xarxes": 0.0
  },
  "penalties": {
    "Hisenda": 0.30,
    "RRHH": 0.40,
    "Urbanisme rutinari": 0.50,
    "default": 0.80
  }
}
```

### Criteri de càrrega inicial
La migració fa un `UPDATE` idempotent només sobre el primer registre existent de `alertas_reglas` (`ORDER BY id LIMIT 1`) i només si `trending_config_json IS NULL`.

Això limita el blast radius en una taula multirow i evita tocar altres regles d'usuari si ja s'ha carregat manualment una configuració.

### Auditoria
Quan es carrega el valor inicial, també es persisteix:
- `trending_config_updated_at = NOW()`
- `trending_config_updated_by = 'Juan'`

Aquests camps deixen rastre del moment i del responsable de l'última edició manual de la configuració editorial.

### Ubicació operativa
La font de veritat de la configuració viu ara a:
- taula: `public.alertas_reglas`
- camps: `trending_config_json`, `trending_config_updated_at`, `trending_config_updated_by`

### Compatibilitat i retrocompatibilitat
- No es crea cap taula nova.
- No s'elimina cap columna ni índex existent.
- Les lectures existents de `alertas_reglas` continuen sent compatibles perquè els camps nous són opcionals.
- La restricció `CHECK` només s'aplica quan hi ha JSON informat.
- La càrrega inicial és idempotent i no sobreescriu una configuració ja existent.

### Evidència esperada de verificació
Per tancar aquesta tasca cal verificar localment:
1. que la migració aplica sense error,
2. que es pot reexecutar sense error,
3. que les columnes existeixen,
4. que el JSON inicial és parsejable,
5. que les consultes bàsiques sobre `alertas_reglas` continuen funcionant.
