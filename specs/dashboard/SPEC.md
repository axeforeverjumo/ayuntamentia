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

## 2026-05-09 — Disseny d'ingesta de vídeos de plens per a tendències

### Canvis realitzats
- S'ha consolidat al repositori un document de disseny per definir la nova font de vídeos de plens com a entrada analítica per a tendències i intel.
- S'han deixat especificades les etapes demanades al brief: captura del vídeo, transcripció, revisió/QA i extracció-assimilació de temes.
- S'ha documentat com aquesta font s'hauria d'integrar amb el càlcul de tendències del dashboard i amb la capa d'intel, sense reintroduir el bloc d'`intel stream` al dashboard.
- S'han fixat criteris mínims de qualitat per decidir quan una transcripció és apta per entrar en anàlisi.

### Arxius modificats
- `specs/dashboard/video-plens-ingesta-tendencies.md`
- `specs/dashboard/SPEC.md`

### Decisions tècniques
- La tasca s'ha tractat com a **exploració**: no s'han fet canvis en codi de producció (`api/`, `web/`, `pipeline/`, `supabase/`).
- El disseny pren com a base l'arquitectura existent del repositori:
  - `api/src/routes/dashboard.py` per al càlcul actual de tendències,
  - `api/src/routes/intel.py` per al consum analític a intel,
  - `pipeline/src/workers/tasks.py` com a patró d'orquestració d'ingestes.
- La font vídeo queda definida com a font **complementària** a les actes, amb política explícita per evitar doble recompte quan acta i vídeo corresponen al mateix ple.
- El dashboard hauria de consumir només agregats i mètriques derivades del vídeo, mai la transcripció crua directament.

### Verificació
- Es tracta d'una intervenció documental; no s'han executat build ni lint de frontend/backend perquè no s'ha modificat codi d'aplicació.
- S'ha verificat la presència dels arxius de spec i del document de disseny dins `specs/dashboard/`.
