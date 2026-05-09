# Disseny d’ingesta de vídeos de plens per a tendències

Data: 2026-05-09  
Àrea: dashboard / tendències / intel / pipeline  
Tipus de tasca: exploració

## Estat del document

Aquest fitxer es manté com a **punt d’entrada documental** per a la funcionalitat.

El document canònic i més alineat amb l’estructura de specs del repositori és:

- `specs/dashboard/video-plens-ingesta-tendencies.md`

## Resum executiu

S’ha definit un flux complet per incorporar vídeos de plens com a nova font analítica per a tendències i intel, incloent:

1. captura i catàleg del vídeo,
2. preparació d’àudio i transcripció,
3. revisió humana i control de qualitat,
4. segmentació analítica i extracció de temes,
5. assimilació amb actes, premsa, social i Parlament,
6. criteris mínims de qualitat abans d’usar transcripcions en anàlisi.

## Decisions tancades

- Els vídeos de plens són una **font complementària** a les actes, no una substitució.
- La senyal de vídeo ha d’entrar a tendències com a component traçable i separat.
- Cal evitar el doble recompte quan acta i vídeo corresponen al mateix ple.
- Intel pot consumir aquesta font com a context i evidència, però **sense reintroduir l’`intel stream` al dashboard**.
- Només s’han d’utilitzar transcripcions revisades o aprovades amb qualitat suficient.

## Referència

Per al disseny complet, fases, integració i criteris de qualitat, consultar:

- `specs/dashboard/video-plens-ingesta-tendencies.md`

## Traçabilitat de la iteració

Aquesta tasca es documenta també a:

- `specs/dashboard/SPEC.md`

No s'han introduït canvis de producció en aquesta iteració; el resultat és exclusivament de disseny i especificació.
