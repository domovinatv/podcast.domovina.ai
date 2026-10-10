# Ideja: sviđa / ne sviđa + obavijesti o novim epizodama (NIJE IMPLEMENTIRANO)

> Status: **ideja, zapisana 11.10.2026.** Ništa od ovoga nije izgrađeno. Nadograđuje
> ono što je uvedeno istog dana: „Nove epizode po danima" na naslovnici i „☆ Prati"
> (commit `0a6baed`).

## Što već postoji (temelj)

| Dio | Gdje | Što radi |
|---|---|---|
| Arhiva po danima | `/dani/`, `/dani/<datum>/`, `src/data/days.json` | Sve nove epizode HR podcasta dan po dan (točni datumi iz YouTube Data API-ja, `fetch.domovina.tv/automatic/backfill_days.js`) |
| Traka dana + kalendar na naslovnici | `src/pages/index.astro`, `DayPicker lazy` | Dnevni ulaz: „što je novo danas" |
| ☆ Prati | `src/scripts/follow.js` | Popis praćenih kanala u `localStorage` (`following`), atribut `data-mine` |
| Filter ★ Moji | `src/scripts/app.js` (`f=mine`, pamti se) | Katalog + feed + brojevi na traci samo za praćene |
| „Podcasti koje pratiš" | `src/pages/dani/[date].astro` | Na vrhu dnevne stranice |

Ograničenje danas: sve je **po pregledniku**, nema računa, nema servera, pa nema ni
načina da se nekome javi kad izađe nova epizoda.

## Ideja

1. **Sviđa / ne sviđa** — uz „Prati" signal i na razini kanala i epizode:
   - 👍 kanal/epizoda → pojačaj slične (kategorija, tagovi, voditelji, gosti)
   - 👎 → nikad ga ne nudi, utišaj u feedu (sklopi, ne briši — katalog ostaje
     „free speech aggregator", ne cenzuriramo, samo personaliziramo pogled)
2. **Preporuke** — „Za tebe danas" na vrhu dana: nove epizode rangirane po signalima.
   Kandidat-signali, od jeftinih prema skupima:
   - kategorija i tagovi kanala (`catalog.json`)
   - voditelji / gosti (registry `hosts`; gosti iz RAG person mapa, `domovina-rag`)
   - sadržaj epizode: embeddingi naslova/sažetka; za kanale na domovina.ai i
     RAG chunkovi (ClickHouse `rag_chunks`)
   - sličnost korisnika (collaborative) tek kad bude dovoljno korisnika
3. **Obavijesti** — kad nightly objavi nove epizode (KORAK 5c gradi `days.json`),
   javi korisniku samo ono što ga zanima:
   - Web Push (PWA) — najjeftinije, radi bez aplikacije
   - e-mail dnevni sažetak („3 nove epizode tvojih podcasta")
   - kasnije domovina.ai app (Flutter) push
   - WhatsApp već postoji kao kanal (`share_to_whatsapp.js`) — moguće za grupe/interese

## Što bi trebalo izgraditi (kad dođe red)

- **Identitet + sinkronizacija**: račun (Supabase u `domovina-api`, isti kao
  „Izborni dan" glasanje) ili anoniman uređaj-ID; `localStorage` popis `following`
  migrira se na prvu prijavu.
- **Tablice** (skica): `podcast_follows(user, slug)`, `podcast_votes(user, slug|episode_id, +1/-1)`,
  `push_subscriptions(user, endpoint, keys)`.
- **Okidač**: nightly nakon 5c (ili Worker cron) diffa nove ID-eve dana → za svakog
  korisnika presjek s interesima → push/mail. Batch po korisniku, ne po epizodi.
- **Statičnost stranice ostaje**: personalizacija na klijentu (kao sada `data-mine`),
  server drži samo signale i šalje obavijesti.

## Otvorena pitanja

- Račun obavezan ili anonimno + Web Push bez prijave?
- Koliko obavijesti dnevno je previše (prag, tihi sati, jedan dnevni sažetak)?
- Smije li 👎 utjecati na javni poredak kataloga? (Prijedlog: **ne** — samo osobni pogled.)
- Privatnost: interesi su osjetljivi (vjera, politika) — minimalno pohranjivati,
  bez dijeljenja s trećima.
