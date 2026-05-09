# SPEC — Dashboard

## 2026-05-09 — Eliminació del bloc "intel stream" del dashboard

### Canvis realitzats
- S'ha eliminat del dashboard el bloc visual final relacionat amb la Sala d'Intel·ligència (CTA i accessos ràpids), que era la presència associada a l'"intel stream" en aquesta pantalla.
- S'ha verificat que no quedin referències visuals o de navegació a aquest bloc dins de `dashboard/page.tsx`.
- S'han netejat imports que quedaven sense ús després de l'eliminació del bloc.

### Arxius modificats
1. `web/src/app/dashboard/page.tsx`
   - Eliminat el bloc complet de la fila final (CTA de Sala d'Intel·ligència) que incloïa:
     - badge i copy de "SALA D'INTEL·LIGÈNCIA"
     - enllaços de preguntes suggerides
     - botó principal d'obertura cap al xat/sala
   - Eliminat `StatusBadge` de l'import de `StatusBadge.tsx`.
   - Eliminat `APP_ROUTES` de l'import de `@/lib/routes`.

2. `specs/dashboard/SPEC.md`
   - Creat/actualitzat amb el registre d'aquesta intervenció.

### Decisions tècniques
- S'ha aplicat un canvi mínim i quirúrgic només a la vista del dashboard per complir l'abast del brief.
- No s'han tocat altres pantalles (`/intel`, `/sala-intelligencia`, etc.) perquè la petició era exclusivament sobre la presència del bloc al dashboard.

### Verificació
- Build frontend executada amb èxit:
  - `npm --prefix web run build`
  - Resultat: compilació correcta i ruta `/dashboard` generada sense errors.
