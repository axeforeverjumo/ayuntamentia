# SPEC frontend

## 2025-02-14 — Forçar català en slugs, links i rutes visibles

### Canvis realitzats
- S'ha unificat el mapa de rutes visibles a `web/src/lib/routes.ts` amb segments catalans per a tota la navegació pública i autenticada.
- S'ha reforçat la validació de rutes amb `assertCatalanRoute` i `buildRoute` per bloquejar segments no contemplats per la convenció catalana.
- S'han actualitzat enllaços interns clau perquè usin `APP_ROUTES` i `buildRoute` en lloc de literals amb segments antics.
- S'han afegit punts d'entrada físics en català a l'App Router (`/acces`, `/tauler`, `/cercar`, `/sala-intelligencia`, `/aterratge`, `/administracio`, `/configuracio`, `/intel-ligencia`, `/actes/[id]`, `/municipis/[id]`, `/sala-intelligencia/espai-treball`).
- S'ha implementat canonicalització de rutes antigues via `proxy.ts` amb redirects 308 des de segments antics en castellà/anglès cap a la versió catalana.

### Arxius modificats
- `web/src/lib/routes.ts`
- `web/src/app/landing/page.tsx`
- `web/src/app/dashboard/page.tsx`
- `web/src/app/municipios/[id]/page.tsx`
- `web/src/app/municipios/page.tsx`
- `web/src/app/actas/[id]/page.tsx`
- `web/src/app/regidors/[id]/page.tsx`
- `web/src/app/chat/workspace/page.tsx`
- `web/src/app/chat/page.tsx`
- `web/src/components/ui/AlertaDetailModal.tsx`
- `web/src/app/buscar/page.tsx`
- `web/src/app/login/page.tsx`
- `web/src/proxy.ts`
- `web/src/app/acces/page.tsx`
- `web/src/app/tauler/page.tsx`
- `web/src/app/sala-intelligencia/page.tsx`
- `web/src/app/sala-intelligencia/espai-treball/page.tsx`
- `web/src/app/cercar/page.tsx`
- `web/src/app/administracio/page.tsx`
- `web/src/app/configuracio/page.tsx`
- `web/src/app/aterratge/page.tsx`
- `web/src/app/intel-ligencia/page.tsx`
- `web/src/app/actes/[id]/page.tsx`
- `web/src/app/municipis/[id]/page.tsx`

### Decisions tècniques
- No s'han eliminat les carpetes antigues de l'App Router per minimitzar risc i preservar historial; la canonicalització es fa amb redirects i noves rutes catalanes visibles.
- La validació de segments només accepta segments registrats explícitament a la convenció catalana o IDs numèrics; així es detecten regressions quan apareixen slugs nous en castellà o anglès.
- Per reduir regressions futures, la navegació interna ha passat a dependre de constants centralitzades en lloc de literals dispersos.

## 2025-02-14 — Continuació de la migració real de rutes visibles

### Canvis realitzats
- S'ha completat la convenció catalana a `web/src/lib/routes.ts` perquè les constants públiques apuntin a `/acces`, `/tauler`, `/cercar`, `/sala-intelligencia`, `/intel-ligencia`, `/administracio`, `/recepcio`, `/subscripcions`, `/aterratge` i `/actes`.
- S'ha afegit `LEGACY_ROUTE_REDIRECTS` i s'ha cablejat a `web/src/proxy.ts` per redirigir amb 308 les rutes antigues visibles (`/login`, `/dashboard`, `/chat`, `/chat/workspace`, `/buscar`, `/admin`, `/landing`, `/intel`, `/settings`, `/suscripciones`, `/recepcion`).
- S'han actualitzat enllaços interns visibles perquè facin servir `APP_ROUTES` i `buildRoute` a la landing, la Sala d'Intel·ligència, el workspace, el detall de municipi, el detall d'acta i el modal d'alertes.
- S'ha reforçat la validació perquè qualsevol segment no registrat a la convenció catalana falli en `assertCatalanRoute`, evitant permissivitat excessiva.

### Arxius modificats
- `web/src/lib/routes.ts`
- `web/src/app/chat/page.tsx`
- `web/src/app/chat/workspace/page.tsx`
- `web/src/app/landing/page.tsx`
- `web/src/app/municipios/[id]/page.tsx`
- `web/src/app/actas/[id]/page.tsx`
- `web/src/components/ui/AlertaDetailModal.tsx`
- `web/src/proxy.ts`
- `specs/frontend/SPEC.md`

### Decisions tècniques
- S'han mantingut els directoris antics de l'App Router com a compatibilitat interna i s'ha posat la canonicalització a `proxy.ts` per evitar trencar imports o fluxos existents.
- La migració real s'ha centrat primer en les rutes visibles i enllaços de navegació; els alias antics segueixen existint però deixen de ser la URL canònica.
- La validació deixa de permetre qualsevol slug en minúscules, de manera que noves rutes fora del vocabulari català queden bloquejades durant el desenvolupament.

## 2025-02-14 — Correcció de regressió de compilació i tancament de la convenció catalana

### Canvis realitzats
- S'ha corregit la regressió a `web/src/app/chat/workspace/page.tsx` deixant la pàgina en estat de sintaxi vàlid i reconnectant-la al mapa centralitzat de rutes.
- S'ha completat `APP_ROUTES` amb les rutes catalanes canòniques que la iteració anterior ja referenciava (`/acces`, `/tauler`, `/sala-intelligencia`, `/sala-intelligencia/espai-treball`, `/cercar`, `/administracio`, `/intel-ligencia`, `/subscripcions`, `/aterratge`, `/actes`).
- S'ha reforçat `assertCatalanRoute` eliminant el fallback permissiu que acceptava qualsevol segment en minúscules, de manera que només es permetin segments declarats explícitament o IDs numèrics.
- S'ha completat la canonicalització de rutes antigues via `proxy.ts` perquè accessos a `/login`, `/dashboard`, `/chat`, `/chat/workspace`, `/buscar`, `/admin`, `/landing`, `/intel`, `/settings`, `/suscripciones` i `/recepcion` redirigeixin a la seva URL visible en català.
- S'han actualitzat enllaços i navegació interna de landing, Sala d'Intel·ligència i workspace perquè mostrin sempre la versió catalana visible.

### Arxius modificats
- `web/src/lib/routes.ts`
- `web/src/proxy.ts`
- `web/src/app/chat/page.tsx`
- `web/src/app/chat/workspace/page.tsx`
- `web/src/app/landing/page.tsx`
- `specs/frontend/SPEC.md`

### Decisions tècniques
- S'ha prioritzat una correcció quirúrgica sobre la base existent per no reobrir l'abast de la migració anterior.
- La validació de rutes queda centralitzada a `web/src/lib/routes.ts`, que actua com a criteri únic de segments vàlids en català.
- Els aliases antics continuen existint com a estructura interna de l'App Router, però la navegació visible i la canonicalització externa passen per les rutes catalanes del mapa centralitzat.

## 2025-02-14 — Auditoria intermèdia i reforç de validació de rutes visibles

### Canvis realitzats
- S'ha afegit el script `validate:routes` a `web/package.json` perquè la comprovació de rutes catalanes es pugui executar explícitament des de npm.
- S'ha creat `web/scripts/validate-catalan-routes.mjs` per auditar literals de rutes visibles i detectar regressions amb segments antics com `login`, `dashboard`, `chat`, `buscar`, `admin`, `municipios` o `actas`.
- S'han corregit enllaços visibles que encara apuntaven a slugs no catalans en `dashboard`, `buscar`, `municipios`, `actas`, `regidors`, `AlertaDetailModal`, `SourceCard` i `MapaCatalunyaLeaflet`, substituint-los per `APP_ROUTES` i `buildRoute`.
- S'ha mantingut `proxy.ts` com a capa de compatibilitat per redirigir rutes antigues, però el validador encara la marca com a pendent perquè conté literals legacy explícits.

### Arxius modificats
- `web/package.json`
- `web/scripts/validate-catalan-routes.mjs`
- `web/src/app/dashboard/page.tsx`
- `web/src/app/buscar/page.tsx`
- `web/src/app/municipios/page.tsx`
- `web/src/app/municipios/[id]/page.tsx`
- `web/src/app/actas/[id]/page.tsx`
- `web/src/app/regidors/[id]/page.tsx`
- `web/src/components/ui/AlertaDetailModal.tsx`
- `web/src/components/ui/SourceCard.tsx`
- `web/src/components/features/MapaCatalunyaLeaflet.tsx`
- `web/eslint.config.mjs`
- `specs/frontend/SPEC.md`

### Decisions tècniques
- El control automàtic s'ha implementat en forma de script dedicat per no dependre només de convencions manuals.
- La validació se centra en rutes visibles del frontend i ignora endpoints `/api/*`, però encara necessita una excepció o modelatge específic per a `proxy.ts` perquè allà les rutes legacy són intencionades com a redireccions.
- No s'han eliminat els alias antics de l'App Router en aquesta iteració; s'ha prioritzat limitar l'abast i corregir els enllaços visibles reals.
