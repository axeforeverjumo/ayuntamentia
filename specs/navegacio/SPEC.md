# SPEC — Navegació visible en català

## 2026-05-07 — Forçar català en slugs, links i rutes visibles

### Objectiu
Garantir que totes les rutes visibles, slugs i enllaços de la plataforma es presentin sempre en català, amb una convenció única i una validació reutilitzable per evitar regressions futures.

### Canvis realitzats

#### 1) Convenció única de rutes visibles en català
**Arxius:**
- `web/src/lib/routes.ts`
- `web/src/lib/routeUtils.ts`
- `web/src/lib/routeGuard.ts`
- `web/src/lib/visibleRoutes.ts`
- `web/src/lib/navigation.ts`

- Es consolida la convenció de rutes visibles en català mitjançant `ROUTE_PATHS`.
- Es mantenen àlies de compatibilitat (`ROUTE_ALIASES`) per normalitzar rutes antigues o en castellà cap a la versió catalana.
- Es valida cada ruta visible amb `assertVisibleRouteInCatalan()` perquè qualsevol nova ruta fora de la convenció falli durant ús/importació.
- Es centralitza la construcció de paths visibles i query strings a `navigation.ts`.

#### 2) Correcció d’enllaços visibles que encara apuntaven a rutes no centralitzades
**Arxius:**
- `web/src/app/chat/workspace/page.tsx`
- `web/src/app/intel/page.tsx`
- `web/src/app/regidors/[id]/page.tsx`
- `web/src/components/features/MapaCatalunyaLeaflet.tsx`

- Es van substituir enllaços literals com `/chat`, `/regidors` i `/municipios/:id` per helpers centralitzats:
  - `visibleRoutes.conversa`
  - `visibleRoutes.regidors`
  - `conversaPath(...)`
  - `municipiDetailPath(...)`
- Això evita que futures edicions introdueixin variants visibles fora del català o incoherents amb la política definida.

#### 3) Inventari funcional aplicat sobre les rutes actuals
Rutes visibles detectades a l’app web:
- `/`
- `/aterratge`
- `/acces`
- `/tauler`
- `/xat`
- `/xat/espai-treball`
- `/cercar`
- `/alertes`
- `/municipis`
- `/regidors`
- `/reputacio`
- `/intel-ligencia`
- `/parlament`
- `/informes`
- `/recepcio`
- `/configuracio`
- `/subscripcions`
- `/administracio`
- `/actes`
- `/legal`

### Decisions tècniques
- **Single source of truth:** tota ruta visible ha de sortir de `ROUTE_PATHS`/`visibleRoutes` o dels helpers de `navigation.ts`.
- **Normalització defensiva:** es permeten àlies antics només per redirigir/normalitzar, no per exposar-los a UI nova.
- **Validació anticipada:** la comprovació de català s’executa sobre totes les rutes visibles declarades per detectar regressions com més aviat millor.
- **Middleware/proxy amb redirecció canònica:** qualsevol accés a rutes visibles antigues (`/login`, `/dashboard`, `/chat`, `/chat/workspace`, `/municipios`, `/settings`, etc.) es normalitza i redirigeix a la ruta catalana canònica.

### Verificació funcional aplicada
- Es va revisar globalment la navegació visible de `web/src` per localitzar literals amb rutes visibles.
- Es van substituir navegacions literals restants per helpers centralitzats a:
  - cerca (`cercaPath`)
  - conversa (`conversaPath`)
  - detall de municipi (`municipiDetailPath`)
  - detall de regidor (`regidorDetailPath`)
  - actes (`actaDetailPath`)
  - espai de treball (`espaiDeTreballPath`)
- Es va reforçar `proxy.ts` perquè apliqui el criteri global fins i tot quan l’usuari entra per una URL antiga o mixta.

### Arxius modificats
- `web/src/app/chat/workspace/page.tsx`
- `web/src/app/intel/page.tsx`
- `web/src/app/regidors/[id]/page.tsx`
- `web/src/components/features/MapaCatalunyaLeaflet.tsx`
- `web/src/components/ui/SourceCard.tsx`
- `web/src/components/ui/AlertaDetailModal.tsx`
- `web/src/proxy.ts`
- `web/src/lib/navigation.ts`
- `specs/navegacio/SPEC.md`

## 2026-05-07 — Enduriment final dels enllaços visibles

### Objectiu
Tancar la regressió restant on encara es generava un enllaç visible literal en castellà dins la UI, assegurant que també les URLs compartides des d'alertes surtin de la font canònica catalana.

### Canvis realitzats
- **Arxiu:** `web/src/app/alertas/page.tsx`
- S'ha substituït la construcció literal de l'URL compartible `'/alertas?id=…'` per `visibleRoutes.alertes`, mantenint la query però forçant el path visible català canònic.
- S'ha afegit l'import de `visibleRoutes` perquè la vista d'alertes no pugui reintroduir paths visibles literals fora de la convenció centralitzada.

### Decisions tècniques
- Qualsevol URL visible, incloses les de compartir/copiar al porta-retalls, ha de construir-se des de `visibleRoutes` o helpers de `navigation.ts`.
- Es considera regressió qualsevol path literal visible en components de presentació encara que el `proxy` el pugui redirigir després.

### Arxius modificats
- `web/src/app/alertas/page.tsx`
- `specs/navegacio/SPEC.md`
