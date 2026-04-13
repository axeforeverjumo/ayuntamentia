# Manual d'usuari — AyuntamentIA

## Què és

AyuntamentIA és la plataforma d'intel·ligència política d'Aliança Catalana. Monitoritza
els 947 ajuntaments de Catalunya + el Parlament + premsa i xarxes socials, i et dóna
respostes accionables sobre què està passant.

## Accés

1. Obre `https://[el teu domini]/login`
2. Entra amb el teu email i contrasenya (o demana magic link)
3. Si és la primera vegada, l'administrador t'ha d'haver donat d'alta

## Què pots fer

### 🔍 Cerca (`/buscar`)
Cerca text lliure a totes les actes de plens municipals. Mostra resultats amb context.

### 💬 Chat IA (`/chat`)
Pregunta lliurement. L'IA decideix quines eines fer servir i et dóna una **conclusió executiva**
(no un volcat de dades). Exemples:
- "Què s'ha votat sobre habitatge a Girona aquest mes?"
- "Compara com vota AC i ERC en seguretat"
- "Ranking de regidors del PSC menys alineats amb el partit"
- "Quin eco social ha tingut la moció anti-immigració?"

### 🔔 Alertes (`/alertes`)
Veu automàticament:
- Incoherències internes (votar X a un municipi i ¬X a un altre)
- Tendències emergents (temes que creixen ràpid)
- Salts geogràfics (un tema que apareix de cop a 3+ comarques)
- Reaccions socials negatives a punts de pleno

### 🏛️ Parlament (`/parlament`)
Sessions del Parlament + DSPC + contradiccions entre discurs parlamentari i vot municipal.

### 📡 Recepció social (`/recepció`)
Eco a premsa catalana (Vilaweb, Nació, Ara, ElNacional, ElPuntAvui) i Bluesky.
Sentiment agregat per tema.

### 📨 Subscripcions (`/subscripcions`)
Crea briefs personalitzats: tries temes (medi ambient, comerç, pesca, agricultura, caça…)
i et arriben per email o Telegram el dia/hora que vulguis (cron).
Format: titular → moviments clau → eco social → riscos/oportunitats → què vigilar.

### 📊 Informes (`/informes`)
Informes setmanals automàtics per a la direcció.

## Preguntes freqüents

**Per què el chat ja no em dóna llistes llargues?**
S'ha reescrit per donar-te conclusions accionables (mode anàlisi). Si vols el detall,
demana-ho explícitament: "dóna'm la llista completa".

**Quants dies tarda en aparèixer un pleno nou?**
Catàleg sincronitzat cada 6h. Processament 1-3 dies depenent del backlog.

**Puc exportar dades?**
Demana a l'administrador. Tot export queda registrat al log d'auditoria.

**Què passa amb el RGPD?**
Si el teu rol té activat "anonimitzar noms particulars", veuràs inicials enlloc de noms
de persones que no siguin càrrecs públics.
