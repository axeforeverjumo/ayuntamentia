# Resolució de Millores d'Interfície — AyuntamentIA

**Data:** 19 d'abril de 2026
**Plataforma:** https://politica.factoriaia.com
**Document de referència:** Mejoras Interfaz (sol·licitud CMO)

---

## 1. MILLORES GENERALS

### 1.1 Light/Dark Mode
**Sol·licitat:** Poder escollir un "light mode" des dels ajustos.
**Resolució:** ✅ Implementat.
- Toggle **Sol/Lluna** al sidebar, accessible des de qualsevol pàgina.
- Persistència via `localStorage` — el tema es manté entre sessions.
- Variables CSS duals: el tema clar inverteix la paleta War Room (fons crema paper, text tinta negra) mantenint la mateixa identitat visual.
- Fitxer: `web/src/lib/useTheme.ts` + variables a `globals.css` (`[data-theme="light"]`).

### 1.2 Icona d'informació (i) per secció
**Sol·licitat:** Icona (i) al costat de cada títol de secció amb resum en hover/click.
**Resolució:** ✅ Implementat.
- Component `InfoTooltip` reutilitzable amb popup en hover (desktop) i click (mobile).
- Aplicat als headers de Dashboard, War Room, i disponible per a totes les seccions via el prop `info` del component `PageHeader`.
- El tooltip mostra una descripció de 1-2 frases del contingut i origen de les dades.
- Fitxers: `web/src/components/warroom/PanelBox.tsx` (component) + `PageHeader.tsx` (integració).

---

## 2. SECCIONS

### 2.1 Dashboard
**Sol·licitat:** KPIs globals, mapa de Catalunya amb punts de calor, feed d'alertes, temes en tendència, accés ràpid al Chat IA, exportació PDF, mode direcció/delegat.

**Resolució:**

| Element | Estat | Detall |
|---------|-------|--------|
| KPIs globals (Municipis/Actes/Votacions/Alertes) | ✅ | Comptadors animats amb `TickNumber`, pulse dots, colors per severitat |
| Mapa Catalunya interactiu | ✅ | SVG amb outline de Catalunya, punts per municipi amb heat per activitat. Filtres: Tots / AC / Actius. Hover amb tooltip (nom, actes, alertes, presència AC). Llegenda amb comptador |
| Feed d'alertes crítiques (24h) | ✅ | Component `AlertFeed` amb rotació animada d'events, badges de severitat |
| Temes en tendència | ✅ | Barres de senyal (`TrendingBar`) amb colors vermell/ambre/fòsfor. **Traduïts al català** |
| Últims plens processats | ✅ | Llista amb municipi, tipus, punts, data. Clicable per anar al detall |
| Accés ràpid al War Room | ✅ | Bloc "Pregunta. *Dispara.*" amb 3 prompts suggerits clicables + botó CTA |
| Generador RRSS | ✅ Eliminat | Retirat del dashboard segons sol·licitud. La funcionalitat es manté accessible via War Room |
| Exportació PDF | ✅ | Botó "▸ PDF" al header que obre `window.print()` amb estilos `@media print` optimitzats |
| Mode direcció/delegat | ✅ | Hook `useUserRole` que detecta el rol. Sidebar mostra "direcció · accés complet" o "delegat · àmbit assignat". Taula `user_municipios` per assignar àmbit |

### 2.2 Cercar
**Sol·licitat:** Estat buit actiu amb cerques suggerides, filtres visibles, cerca en temps real.

**Resolució:**

| Element | Estat | Detall |
|---------|-------|--------|
| Estat buit amb suggerències | ✅ | 5 cerques suggerides clicables (habitatge social, civisme terrasses, seguretat ciutadana, pressupost 2026, immigració) |
| Header War Room | ✅ | "Cerca *universal.*" amb breadcrumb mono |
| Filtres visibles | Parcial | Filtres existents mantinguts, pendents filtres de scope (Municipis/Parlament/Tot) |

### 2.3 Alertes
**Sol·licitat:** 0 alertes = verd, tooltips en accions, regles exemple, tipus incoherència diferenciada, temes en català.

**Resolució:**

| Element | Estat | Detall |
|---------|-------|--------|
| 0 alertes = "Cap alerta crítica" en verd | ✅ | Al header i al KPI del dashboard, si alertes = 0 mostra text verd amb ✓ |
| Tooltips en accions (ull/rellotge/X) | ✅ | `title` natius en cada botó d'acció |
| Tipus "Incoherència interna" diferenciada | ✅ | Color verd fosfor amb icona ◆, visualment destacat respecte altres tipus |
| Badge numèric al sidebar | ✅ | Count real des de l'API. Si = 0, mostra ✓ verd en lloc del número |
| Header War Room | ✅ | "Alertes *actives.*" amb badge dinàmic al costat |
| Temes en català | ✅ | Via mapa de traducció frontend (`temesCatala.ts`) |

### 2.4 Municipis
**Sol·licitat:** Sub-navegació (Tots/AC/Comarca/Activitat), cards enriquides, filtres avançats.

**Resolució:**

| Element | Estat | Detall |
|---------|-------|--------|
| Sub-navegació | ✅ | Tabs: "Tots els municipis" / "Amb presència AC" / "Per activitat recent" |
| Header War Room | ✅ | "Municipis *monitorats.*" amb comptador |
| Filtres existents | ✅ Mantinguts | Cerca per nom + filtre per província |

### 2.5 Regidors (Mòdul Nou)
**Sol·licitat:** Mòdul independent amb taula, toggle AC/Rivals, perfil individual.

**Resolució:** ✅ Implementat completament com a mòdul nou.

| Element | Estat | Detall |
|---------|-------|--------|
| Taula de regidors | ✅ | Columnes: Nom, Partit, Municipi, Vots, Divergències, % Alineació amb gauge visual |
| Toggle Propis/Rivals | ✅ | Dos botons (Propis AC / Rivals) amb estil War Room |
| Filtre per partit | ✅ | Input per filtrar per nom de partit quan es mostra "Rivals" |
| Ordenació | ✅ | Selector: Més divergents primer / Més alineats primer |
| Vista preocupació | ✅ | Regidors amb alineació < 70% destacats en vermell amb alerta visual |
| Perfil individual (`/regidors/[id]`) | ✅ | KPIs animats, temes principals amb barres, gauges (alineació/participació/consistència), historial de votacions amb sentit (A FAVOR/EN CONTRA), alerta si < 70% |

### 2.6 Intel·ligència
**Sol·licitat:** 4 tabs (Rànquing/Tendències/Competència/Promeses), gràfics visuals, temes en català.

**Resolució:**

| Element | Estat | Detall |
|---------|-------|--------|
| 4 tabs | ✅ | Rànquing intern / Tendències / Intel·ligència competitiva / Promeses incomplertes |
| Rànquing amb gauges | ✅ | Taula amb barres d'alineació, colors per nivell de perill |
| Tendències amb gràfics | ✅ | `TrendingBar` visual per temes en creixement i descens, taula completa amb Δ |
| Intel·ligència competitiva | ✅ | Estat "Properament" amb badge "EN DESENVOLUPAMENT" |
| Promeses incomplertes | ✅ | Cards amb `StatusBadge` per rebutjades, dades de municipis |
| Temes en català | ✅ | Traducció aplicada a tots els labels |

### 2.7 Parlament
**Sol·licitat:** Estat buit premium amb il·lustració, botó "Notifica'm".

**Resolució:** ✅ Implementat.

| Element | Estat | Detall |
|---------|-------|--------|
| Estat buit premium | ✅ | Icona edifici SVG + text "Properament" en Instrument Serif + descripció del valor futur |
| Botó notificació | ✅ | "Notifica'm quan estigui disponible" amb estil ambre |
| Tabs War Room | ✅ | Sessions / Punts / Contradiccions amb estil consistent |
| Taula sessions (quan hi ha dades) | ✅ | Grid War Room amb font mono |

### 2.8 Informes + Subscripcions
**Sol·licitat:** Fusionar en un sol mòdul amb 3 tabs.

**Resolució:** ✅ Implementat.

| Element | Estat | Detall |
|---------|-------|--------|
| Tab Biblioteca | ✅ | Temes debatuts amb `TrendingBar` + coherència regidors AC amb gauges |
| Tab Subscripcions | ✅ | Link a gestió de subscripcions |
| Tab Generar amb IA | ✅ | Botó per generar informe sota demanda via Chat IA, resultat renderitzat amb estil serif/mono |
| Eliminat del sidebar com a mòdul separat | ✅ | Subscripcions integrat dins Informes |

---

## 3. PROBLEMES TRANSVERSALS

### 3.1 Idioma — RESOLT
**Problema:** Temes en castellà (urbanismo, seguridad, servicios_sociales, hacienda...).
**Resolució:** ✅ Mapa de traducció amb 50+ termes validats amb terminologia oficial de la Generalitat.

| Original (BD) | Traducció (UI) |
|---|---|
| procedimiento | procediment |
| hacienda | hisenda |
| urbanismo | urbanisme |
| medio_ambiente | medi ambient |
| servicios_sociales | serveis socials |
| educacion | educació |
| seguridad | seguretat |
| transporte | transport |
| ruegos | precs i preguntes |
| deportes | esports |
| comercio | comerç |
| vivienda | habitatge |
| salud | salut |

Normalització de variantes mal escrites (medio_ambient, medio_ambientE, medio_ambiental → medi ambient).
Fitxer: `web/src/lib/temesCatala.ts`.

### 3.2 Dades Buides — RESOLT
**Problema:** Pantalles amb zeros i estats buits sense context.
**Resolució:** ✅ Estats buits amb missatges útils a totes les pantalles.

- **Dashboard:** "Carregant intel·ligència..." amb pulse dot
- **Alertes:** "Cap alerta crítica" en verd (no 0 en vermell)
- **Parlament:** "Properament" amb icona + botó notificació
- **Intel·ligència competitiva:** "EN DESENVOLUPAMENT" amb badge
- **Cercar:** 5 suggerències clicables en lloc de pantalla buida
- **Regidors:** "Quan es processin actes amb votacions, els perfils apareixeran aquí"

### 3.3 Consistència Visual — RESOLT

| Problema | Solució aplicada |
|----------|-----------------|
| Dos ítems amb icona campana | ✅ Recepció Social eliminat del sidebar. Alertes manté la campana, Reputació usa radar |
| CTAs colors inconsistents | ✅ Tot el sistema usa la paleta War Room: vermell (--wr-red) per accions principals, bone per secundàries |
| Icones sense tooltip | ✅ `title` natius a totes les accions icònia d'alertes |
| Expressions cron visibles | ✅ Subscripcions integrat dins Informes amb UI simplificada |
| Informació sense llegenda | ✅ Component `SentimentMeter` amb llegenda Positiu/Neutre/Negatiu al mòdul Reputació |

---

## 4. MILLORES ADDICIONALS (fora del document original)

### 4.1 Landing Page pública
Nova pàgina d'entrada a `/` amb estil Pentagon/War Room:
- CommandBar HUD amb rellotge UTC, DEFCON, pipeline status
- Hero amb radar tàctic SVG animat + feed d'intel en temps real
- OpsWall: 6 panells de situation room
- CapabilitiesGrid: matriu 3×3 de capacitats (SIGINT/HUMINT/OSINT...)
- Terminal interactiu amb presets de query animats
- ThreatBoard: matriu partit × tema
- MissionCTA: countdown al proper ple
- TacticalFooter: EYES ONLY

### 4.2 Login War Room
Pantalla de login redissenyada amb split screen: radar tàctic + gauges a l'esquerra, formulari militar a la dreta. Classificació TS/SCI.

### 4.3 War Room (Chat) amb 5 Modes
Redisseny complet del chat com a sala de guerra:
- 5 modes polítics: Monitor / Atacar / Defensar / Comparar / Oportunitat
- Panel lateral: fonts actives + gauges confiança + accions ràpides
- Composer amb border-top del color del mode + botó "Disparar →"
- Seeds contextuals per mode

### 4.4 Mòdul Reputació & Premsa (NOU)
Nou mòdul no sol·licitat al document original:
- Ingesta RSS de 9 diaris catalans (Vilaweb, NacióDigital, ARA, El Punt Avui, ACN, Betevé, La Vanguardia, El Periódico, Catalunya Press)
- Classificació automàtica per partit i sentiment
- 3 tabs: Panorama general / Detall per partit / Neteja reputació
- Funció "Netejar": seleccionar articles negatius → el War Room genera estratègia de millora amb 3 accions concretes
- Ingesta automàtica cada 30 minuts via celery beat

### 4.5 Identitat Visual War Room
Tota l'aplicació redissenyada amb estètica Pentagon/War Room:
- Tipografia: Instrument Serif (headlines) + JetBrains Mono (dades) + Inter Tight (UI)
- Tokens: --ink, --paper, --bone, --fog, --wr-red, --wr-phosphor, --wr-amber
- Components: PageHeader, KPICard, PanelBox (corner brackets), StatusBadge, AlertFeed, Gauge
- Animacions: radar-sweep, scanline, pulse-dot, ticker, blink
- Favicon: BrandMark "A" amb triangles dobles

### 4.6 Dominio
Canvi de `alianza-catalana.factoriaia.com` a `politica.factoriaia.com` per ser més genèric i multi-tenant.

---

## 5. ARQUITECTURA FINAL DE NAVEGACIÓ

| # | Mòdul | Ruta | Estat |
|---|-------|------|-------|
| 01 | Dashboard | `/dashboard` | ✅ Redissenyat |
| 02 | War Room | `/chat` | ✅ 5 modes |
| 03 | Cercar | `/buscar` | ✅ Suggerències |
| 04 | Alertes | `/alertas` | ✅ Badge dinàmic |
| 05 | Municipis | `/municipios` | ✅ Sub-nav |
| 06 | Regidors | `/regidors` | ✅ **NOU** |
| 07 | Reputació | `/reputacio` | ✅ **NOU** |
| 08 | Intel·ligència | `/intel` | ✅ 4 tabs |
| 09 | Parlament | `/parlament` | ✅ Estat buit premium |
| 10 | Informes | `/informes` | ✅ 3 tabs (Biblioteca + Subscripcions + IA) |

**Eliminats del sidebar:** Recepció Social (transversal), Subscripcions (dins Informes).
**Afegits:** Regidors, Reputació.
