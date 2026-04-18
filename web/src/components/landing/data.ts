export const RIVALS = [
  { id: 'pA', short: 'P·A', name: 'Partit A', color: '#2b4bcc', count: 187 },
  { id: 'pB', short: 'P·B', name: 'Partit B', color: '#c2412a', count: 142 },
  { id: 'pC', short: 'P·C', name: 'Partit C', color: '#d4a017', count: 96 },
  { id: 'pD', short: 'P·D', name: 'Partit D', color: '#7c3aed', count: 61 },
  { id: 'pE', short: 'P·E', name: 'Partit E', color: '#0a8f64', count: 48 },
];

export const TOPICS = [
  'habitatge', 'civisme', 'urbanisme', 'fiscalitat', 'seguretat',
  'comerç local', 'agricultura', 'immigració', 'mobilitat',
  'transició energètica', 'sanitat', 'cultura',
];

export const MUNICIPIS = [
  'Vic', 'Manresa', 'Girona', 'Terrassa', 'Lleida', 'Mataró', 'Reus', 'Sabadell',
  'Tarragona', 'Figueres', 'Granollers', 'Olot', 'Tortosa', 'Vilafranca', 'Valls',
  'Amposta', 'El Vendrell', 'Solsona', 'Ripoll', 'Puigcerdà', 'Banyoles', 'Cervera',
];

export const INTEL_FEED = [
  { t: '03:14', tag: 'CONTRADICCIÓ', sev: 'alta' as const, muni: 'Vic', text: 'Partit A vota EN CONTRA de limitar terrasses. Mateix partit VA A FAVOR a Manresa fa 6 setmanes.' },
  { t: '03:11', tag: 'COINCIDÈNCIA', sev: 'baixa' as const, muni: 'Girona', text: 'Partit B i Partit C pacten transacció sobre ordenança de civisme. Votació: 14–9.' },
  { t: '02:58', tag: 'PROMESA TRENCADA', sev: 'alta' as const, muni: 'Terrassa', text: 'Pressupost 2026 no inclou els 2,4M€ promesos per habitatge social al programa electoral.' },
  { t: '02:44', tag: 'EMERGENT', sev: 'mitjana' as const, muni: '3 comarques', text: '«Soroll nocturn» escala +212% en plens del darrer mes. Salta de 1 a 4 comarques.' },
  { t: '02:31', tag: 'DIVERGÈNCIA', sev: 'mitjana' as const, muni: 'Reus', text: 'Regidora pròpia vota diferent a la moda del grup en 3 punts consecutius sobre fiscalitat.' },
  { t: '02:20', tag: 'CITA LITERAL', sev: 'baixa' as const, muni: 'Parlament', text: '«No tolerarem ni una ocupació més» — portaveu Partit A, DSPC 214/2026. Ref: §4.2' },
  { t: '02:02', tag: 'ECO SOCIAL', sev: 'alta' as const, muni: 'Mataró', text: 'Pleno 18/04 genera 1.387 mencions · 62% negatives · pic a les 20:45.' },
  { t: '01:50', tag: 'FORAT', sev: 'baixa' as const, muni: 'Olot', text: "Cap partit ha parlat d'aigua potable en 11 plens consecutius. Tema amb +340 mencions ciutadanes." },
  { t: '01:33', tag: 'CONTRADICCIÓ', sev: 'alta' as const, muni: 'Figueres', text: "Partit C defensa al Parlament eliminar zones BES. Govern municipal amb el mateix partit n'afegeix 2 de noves." },
  { t: '01:12', tag: 'VOT CLAU', sev: 'mitjana' as const, muni: 'Sabadell', text: "Partit D s'abstén en moció sobre seguretat. Trenca aliança de 9 mesos amb Partit A." },
  { t: '00:58', tag: 'DIVERGÈNCIA', sev: 'alta' as const, muni: 'Lleida', text: "Tinent d'alcalde manifesta posició pública contrària al sentit del vot del grup." },
  { t: '00:41', tag: 'CITA LITERAL', sev: 'baixa' as const, muni: 'Granollers', text: '«La immigració ha de ser ordenada i amb drets» — regidora Partit B, pleno 12/04.' },
];

export const CONTRADICTIONS = [
  {
    rival: 'Partit A', topic: 'Terrasses i soroll', severity: 'alta',
    claim: '"Cal ser contundents amb el civisme i limitar terrasses al centre històric"',
    claimSource: 'DSPC 214/2026 — §4.2, intervenció al Parlament',
    claimDate: '02 abr 2026',
    counter: 'Vot EN CONTRA de limitar terrasses a Vic el 15 abr 2026',
    counterSource: 'Acta pleno ordinari Vic — punt 7, votació 9–11',
    counterDate: '15 abr 2026', gap: '13 dies',
  },
  {
    rival: 'Partit C', topic: 'Zones de baixes emissions', severity: 'alta',
    claim: '"Les BES asfixien les classes treballadores i el petit comerç"',
    claimSource: 'Programa electoral 2023 — p.42',
    claimDate: '10 mai 2023',
    counter: 'Govern municipal amb el mateix partit amplia la BES en 2 sectors',
    counterSource: 'Acta pleno Figueres — punt 3, aprovat 13–8',
    counterDate: '18 abr 2026', gap: '3 anys',
  },
  {
    rival: 'Partit B', topic: 'Habitatge social', severity: 'mitjana',
    claim: '"Destinarem 2,4M€ a habitatge de lloguer assequible"',
    claimSource: 'Programa electoral municipal Terrassa 2023',
    claimDate: '15 mai 2023',
    counter: 'Pressupost 2026 aprovat: 0,3M€ a habitatge (−87% vs promès)',
    counterSource: 'Acta pleno Terrassa — punt 1, aprovat 14–11',
    counterDate: '11 abr 2026', gap: '3 anys',
  },
  {
    rival: 'Partit A', topic: 'Transparència', severity: 'baixa',
    claim: '"Publicarem totes les actes 48h després del pleno"',
    claimSource: 'Roda de premsa — 22 gen 2026',
    claimDate: '22 gen 2026',
    counter: "Retard mitjà de publicació d'actes als municipis on governen: 11 dies",
    counterSource: 'Càlcul intern — 38 actes, últims 60 dies',
    counterDate: '18 abr 2026', gap: '3 mesos',
  },
];

export const MAP_POINTS = [
  { x: 62, y: 46, m: 'Girona', hot: 3 },
  { x: 68, y: 54, m: 'Figueres', hot: 2 },
  { x: 48, y: 58, m: 'Vic', hot: 4 },
  { x: 40, y: 64, m: 'Manresa', hot: 2 },
  { x: 54, y: 70, m: 'Sabadell', hot: 1 },
  { x: 58, y: 76, m: 'Terrassa', hot: 3 },
  { x: 68, y: 82, m: 'Barcelona', hot: 5 },
  { x: 74, y: 68, m: 'Mataró', hot: 2 },
  { x: 26, y: 56, m: 'Lleida', hot: 1 },
  { x: 52, y: 86, m: 'Tarragona', hot: 2 },
  { x: 44, y: 90, m: 'Reus', hot: 1 },
  { x: 20, y: 78, m: 'Tortosa', hot: 0 },
  { x: 36, y: 48, m: 'Olot', hot: 2 },
];

export const TERMINAL_PRESETS = [
  {
    q: 'atacar:civisme:partit_a',
    lines: [
      { c: 'var(--fog)', t: '> Rastrejant 82.352 actes · filtrant per tema=civisme · partit=partit_a' },
      { c: 'var(--wr-phosphor)', t: '> 4 contradiccions ready-to-fire · 2 altes · 2 mitjanes' },
      { c: 'var(--paper)', t: '# 1. [ALTA] Partit A — Terrasses i soroll' },
      { c: 'var(--fog)', t: '  ▸ DIU: «No tolerarem ni una ocupació més» · DSPC 214/2026 §4.2' },
      { c: 'var(--fog)', t: '  ▸ VOTA: En contra de limitar terrasses · Vic · 15/04/2026' },
      { c: 'var(--wr-red-2)', t: '  ▸ GAP: 13 dies · ÚS RECOMANAT: rèplica en torn obert del pleno' },
      { c: 'var(--paper)', t: '# 2. [ALTA] Partit C — Zones BES · Parlament vs Figueres · gap 3 anys' },
      { c: 'var(--wr-phosphor)', t: '✓ Dossier generat · 14 peces · export pdf·md·telegram' },
    ],
  },
  {
    q: 'speech_prep:pleno:vic:22abr',
    lines: [
      { c: 'var(--fog)', t: '> Analitzant ordre del dia · 3 punts · risc alt en punt #1' },
      { c: 'var(--paper)', t: '# MUNICIPI: Vic · SESSIÓ: 22/04/2026 · ORDINARI' },
      { c: 'var(--wr-phosphor)', t: '> 5 peces de munició llistes · 2 rèpliques probables preparades' },
      { c: 'var(--fog)', t: "  ▸ Forat: ningú ha parlat d'aigua potable en 11 plens · +340 mencions ciutadanes" },
      { c: 'var(--wr-red-2)', t: "⚠ Alerta: tinent d'alcalde pot votar divergent segons històric" },
      { c: 'var(--wr-phosphor)', t: '✓ Export: pdf · 4 pàgines · amb cites i fonts' },
    ],
  },
  {
    q: 'monitor:parlament_vs_municipis:bes',
    lines: [
      { c: 'var(--fog)', t: '> Buscant discurs nacional vs acció local · tema=bes' },
      { c: 'var(--paper)', t: '# Partit C · diu X al Parlament, fa Y als municipis' },
      { c: 'var(--fog)', t: '  ▸ Parlament: 5 intervencions contra BES · últims 90 dies' },
      { c: 'var(--fog)', t: '  ▸ Municipis on governen: 2 expansions BES aprovades · Figueres + 1 més' },
      { c: 'var(--wr-red-2)', t: '  ▸ Contradicció directa · dossier automàtic disponible' },
      { c: 'var(--wr-phosphor)', t: '✓ 3 frases atacables generades amb cita literal' },
    ],
  },
];

export const CAPABILITIES = [
  { code: 'C-01', n: 'SIGINT', d: 'Intercepció de senyals: DSPC, Bluesky, premsa digital, RSS.', clas: 'TS/SCI' },
  { code: 'C-02', n: 'HUMINT', d: 'Actives als 947 municipis. Briefs de militància sobre el terreny.', clas: 'S/NF' },
  { code: 'C-03', n: 'OSINT', d: '1.2M mencions/dia · NLP amb classificador propi · 8 sentiments.', clas: 'U/OUO' },
  { code: 'C-04', n: 'GEOINT', d: 'Capes geo · concentració de protestes, ocupacions, punts calents.', clas: 'S/NF' },
  { code: 'C-05', n: 'MASINT', d: 'Patterns-of-life dels rivals: quan publiquen, quan callen, amb qui parlen.', clas: 'TS/NF' },
  { code: 'C-06', n: 'CYBER', d: 'Monitoratge de filtracions · canal Telegram crypted · RLS segregat per tenant.', clas: 'S/ORCON' },
  { code: 'C-07', n: 'FININT', d: 'Cross-ref pressupostos municipals vs anuncis · deviation alerts.', clas: 'TS/NF' },
  { code: 'C-08', n: 'COMINT', d: "Fora-de-micròfon · vídeos tallats · transcripcions full.", clas: 'S/NF' },
  { code: 'C-09', n: 'CND', d: 'Counter-disinformation · fact·check automàtic amb cita literal.', clas: 'U/OUO' },
];

export const THREAT_TOPICS = ['Habitatge', 'Civisme', 'BES', 'Seguretat', 'Transp.', 'Fiscalitat', 'Mobilitat', 'Immigració', 'Cultura'];
