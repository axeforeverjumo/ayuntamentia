# Checklist UAT MVP

## Dades/fixtures recomanades
- Dashboard tendències: usar fixtures locals on `habitatge` superi `hisenda` quan `penalty_applied < 1`.
- Reunions properes: una regla amb reunió a menys de 72h (groc) i una altra a menys de 24h o superada (vermell).
- Sala d'Intel·ligència: una consulta amb context dual (`PLENS` + `PREMSA`) i una altra amb fallada simulada de premsa.

## Flux `/tauler`
- [ ] Obrir `/tauler` i comprovar que carrega KPIs, mapa, temes en tendència i widget d'últims plens sense pantalla en blanc.
  - Esperat: es veu el dashboard complet i els widgets principals renderitzen en menys d'uns segons raonables.
- [ ] Validar el widget **Temes en tendència** amb fixture penalitzat.
  - Esperat: els temes surten ordenats per `trending_score`; `Hisenda` no apareix primer si la penalització editorial l'ha rebaixat per sota d'un altre tema.
- [ ] Validar cas **groc** de reunions properes.
  - Esperat: apareix badge `Avís`, municipi i missatge de marge limitat.
- [ ] Validar cas **vermell** de reunions properes.
  - Esperat: apareix badge `Urgent` i missatge d'imminència o reunió superada.

## Flux mapa
- [ ] Revisar visualment el mapa de `/tauler`.
  - Esperat: no hi ha watermark/attribution visible sobre el mapa; es mantenen els punts i la llegenda inferior.

## Flux `/sala-intelligencia`
- [ ] Llançar una consulta amb resposta dual.
  - Esperat: la resposta mostra fonts agrupades visibles amb capçaleres `PLENS` i `PREMSA` o equivalents clarament atribuïts.
- [ ] Llançar una consulta amb degradació de premsa.
  - Esperat: la pantalla no cau; es manté la resposta i les fonts de `PLENS`, i es mostra un avís parcial indicant que premsa no està disponible.

## Smoke final de rutes
- [ ] Navegar manualment a `/tauler` i `/sala-intelligencia`.
  - Esperat: ambdues rutes obren sense 404 ni errors visibles de render.
