# podcast.domovina.ai — katalog hrvatskih podcasta

Jedno mjesto za sve hrvatske podcaste, složeno po kategorijama, s novim epizodama
čim ih nightly uhvati. Astro, čisto statički build, servira ga Cloudflare Worker
(static assets, bez Worker koda).

```bash
npm install
npm run dev          # http://localhost:4321 (koristi postojeći src/data/catalog.json)
npm run build        # catalog.json iz ../fetch.domovina.tv + astro build
npm run deploy       # build + wrangler deploy (D.O.M. račun, custom domain podcast.domovina.ai)
scripts/refresh.sh   # isto što i deploy — za kraj nightly pipelinea
```

## Odakle podaci

`scripts/build-catalog.mjs` čita (read-only) sibling repo `../fetch.domovina.tv`
(ili `FETCH_REPO=...`) i piše `src/data/catalog.json` i `src/data/days.json`:

| Izvor | Što daje |
|---|---|
| `data/podcasts_registry.json` | svi kanali: tagovi → kategorija, status, aktivnost, voditelji |
| `automatic/watchlist/watch-state.json` | epizode kanala **u pratnji** (originali, bez shortsa i isječaka) |
| `cdn.domovina.ai/channels/data/index_bundle.json` | objavljene epizode kanala **na domovina.ai** (isti bundle kao Flutter app) |
| `automatic/podcasts/<slug>-channel.json` | avatar praćenih kanala (yt3, 176 px) |

Izvan kataloga su statusi `not-podcast`, `dead-url`, `rejected` i `disputed`.
Registry `notes` se namjerno ne objavljuju (interni istraživački zapisi).

**Kategorija** = prvi „jaki" tag kanala (kurator ih piše od najvažnijeg). Slabi
tagovi (`talk-show`, `regional`, `institutional`…) odlučuju samo kad drugih nema.
Mapiranje tag → kategorija je u `CATEGORIES` na vrhu skripte.

**Aktivnost** (od zadnje epizode): aktivan ≤30 d · usporava ≤120 d · uspavan.
Uspavani su u katalogu, ali sklopljeni po kategoriji.

## Raspored

- **Desktop (≥900 px)**: stranica ne skrola. Lijevo „Upravo stiglo" (feed po danima),
  desno masonry panela po kategorijama. Svaka kolona skrola sama. Na širem ekranu
  automatski ima više stupaca.
- **Mobitel**: tabovi Katalog / Upravo stiglo. Kategorije su vodoravna traka, a
  detalj kanala se otvara kao bottom sheet.
- Filteri (pretraga, Svi/Aktivni/Na domovina.ai, kategorija, poredak) žive u URL-u:
  `/?k=sport&f=active` je link koji se može podijeliti.
- Detalj kanala ima trajnu stranicu `/p/<slug>/`. Dijalog na početnoj dohvaća tu
  istu stranicu, pa postoji samo jedna implementacija.

Epizode kanala na domovina.ai vode na `domovina.ai/v/<id>`, ostale na YouTube.

## Nove epizode po danima (`/dani/`)

Kronološka arhiva: `/dani/` je popis dana (broj epizoda, sati audia, tjedni blokovi),
a `/dani/YYYY-MM-DD/` su sve epizode tog dana, grupirane po kategoriji, s ←/→
navigacijom. Na početnoj je traka „Jučer: N epizoda · Svi dani →".

- Podaci su `src/data/days.json`, koji slaže isti `build-catalog.mjs`: sve epizode od
  `ARCHIVE_START` (01.01.2026.) **do jučer**, bez reza na `FEED_SIZE`. Današnji dan se
  izostavlja jer još nije gotov.
- Dan = **točan datum objave** po hrvatskom vremenu iz
  `fetch.domovina.tv/automatic/watchlist/backfill.json` (YouTube Data API,
  `automatic/backfill_days.js`, nightly inkrementalno). Za sve do `covered_until` kanala
  vjeruje se samo toj datoteci; watch-state datumi iz flat liste su točni tek ~12 dana
  unatrag („prije 2 mjeseca" → 61 dan), pa se koriste samo za ono što backfill još nije pokrio.
- Prošlost pokazuje ono što je danas javno: obrisani videi i ugašeni kanali ne vide se.
- Praćeni kanali ulaze tek kad su objavljeni na domovina.ai (bundle), pa se epizoda koja
  se obrađuje danima naknadno pojavi na svom danu — stranice se ionako grade svaku noć.
