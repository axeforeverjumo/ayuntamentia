# SPEC — Política

## 2026-05-14 — spec-002 wave: reunions properes sobre `alertas_reglas`

### Canvis realitzats
- S'ha afegit la migració `supabase/migrations/012_alter_alertas_reglas_meeting_upcoming.sql`.
- Adaptació retrocompatible de `alertas_reglas` amb nous camps nullable:
  - `tipo_regla TEXT`
  - `meeting_title TEXT`
  - `meeting_at TIMESTAMPTZ`
  - `special_channel TEXT`
- **No** s'ha afegit `municipio_id` perquè el model ja té `municipios INTEGER[]` (reutilització explícita del camp existent).
- S'ha afegit un índex idempotent orientat a dashboard:
  - `idx_alertas_reglas_user_tipo_meeting_at` sobre `(user_id, tipo_regla, meeting_at)` amb `WHERE tipo_regla IS NOT NULL`.

### Decisions tècniques
- Es reutilitza el model existent `alertas_reglas` i no es crea cap taula nova.
- Tots els camps nous són nullable per no trencar registres antics.
- No s'imposen nous `CHECK`/defaults en aquesta iteració MVP per mantenir compatibilitat màxima.
- La diferenciació de regla de reunió queda documentada per convenció:
  - `tipo_regla = 'meeting_upcoming'`
  - `severidad = 'alta'`
  - `special_channel = 'dashboard'`

### Compatibilitat retroactiva
- La migració usa `ADD COLUMN IF NOT EXISTS` i `CREATE INDEX IF NOT EXISTS` (idempotent).
- Les consultes i regles existents continuen funcionant sense canvis perquè els nous camps no són obligatoris.

### Exemple mínim MVP (`INSERT` vàlid)
```sql
INSERT INTO alertas_reglas (
  user_id,
  nombre,
  severidad,
  canal,
  activa,
  tipo_regla,
  meeting_title,
  meeting_at,
  special_channel,
  municipios
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Reunió de seguiment pressupost',
  'alta',
  'web',
  TRUE,
  'meeting_upcoming',
  'Comissió d\'Hisenda',
  NOW() + INTERVAL '2 days',
  'dashboard',
  ARRAY[8019]
);
```
