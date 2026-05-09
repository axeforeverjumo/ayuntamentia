# SPEC dashboard

## 2026-05-09 — Redefinició estratègica de temes en tendència

### Canvis realitzats
- S'ha redefinit el càlcul de `GET /api/dashboard/temas` a `api/src/routes/dashboard.py` per passar d'un rànquing per volum brut de mencions a un rànquing **ponderat estratègic**.
- El nou càlcul combina:
  - mencions en actes (`actas_menciones`),
  - nivell mediàtic en premsa (`nivel_mediatico_prensa`),
  - nivell mediàtic en xarxes (`nivel_mediatico_redes`),
  - altres senyals (`nivel_mediatico_otras`).
- S'ha introduït normalització per màxim del conjunt per cada dimensió (`max_actas`, `max_prensa`, `max_redes`, `max_otras`) per evitar que una sola escala domini el rànquing.
- S'ha definit una fórmula de scoring estratègic:
  - `0.45 * actes_norm`
  - `0.30 * premsa_norm`
  - `0.20 * xarxes_norm`
  - `0.05 * altres_norm`
  - resultat en escala 0-100 com `trend_score`.
- S'ha eliminat el panell visual **Intel stream** del dashboard frontend (`web/src/app/dashboard/page.tsx`) tal com demana el brief.

### Arxius modificats
- `api/src/routes/dashboard.py`
- `web/src/app/dashboard/page.tsx`
- `specs/dashboard/SPEC.md`

### Decisions tècniques
- Es manté compatibilitat cap enrere del payload: es continua retornant `count` (mencions) per no trencar consumidors actuals del frontend.
- Els senyals mediàtics es llegeixen de `temas_trend_signals` via `LEFT JOIN` i `COALESCE(..., 0)` per tolerar absència parcial de dades externes.
- La normalització és relativa al top intern actual (max-based normalization) perquè el rànquing sigui estable sense requerir calibratge manual immediat.
- L'eliminació d'Intel stream al dashboard s'ha resolt de forma quirúrgica: s'elimina el bloc visual i el layout passa a una sola columna per a "Últims plens processats".

### Criteri de ranking documentat
1. Agregar mencions de tema a actes processades.
2. Enriquir cada tema amb senyals mediàtics externs (premsa, xarxes, altres).
3. Normalitzar cada factor en rang 0..1 dividint pel màxim observat del lot.
4. Aplicar pesos estratègics (45/30/20/5).
5. Ordenar per `trend_score` descendent; en empat, per volum de mencions.

### Notes operatives
- La taula `temas_trend_signals` i les columnes `nivel_mediatico_*` s'assumeixen disponibles a base de dades per suportar el càlcul.
- En absència de senyals mediàtics, la fórmula es degrada cap al component d'actes, mantenint comportament funcional.
