# Kategorije kataloga i rupa za logopediju (2026-10-05)

Stanje `src/data/catalog.json` (generated 2026-10-05, registry 1.2): **469 podcasta**.

## Dvije razine klasifikacije

1. **13 kategorija** (`categories`, mapiranje u `CATEGORIES` u `scripts/build-catalog.mjs`),
   svaki podcast točno jednu: sport 75 · politika 62 · kultura 56 · vjera 54 · posao 50 ·
   zabava 34 · zdravlje 33 · obitelj 31 · tech 27 · povijest 14 · obrazovanje 14 · mediji 14 ·
   true-crime 5 (zbroj 469).
2. **Tagovi** iz registryja. `tagLabels` (= registry `tag_legend`) ima 52 oznake, sve korištene.

### Tagovi bez labele (25)

Koriste se na podcastima, a nema ih u `tag_legend`, pa bi se na stranici prikazali kao sirovi id:
`regional` 11, `interview` 9, `music` 4, `event-archive` 4, `film` 3, `agriculture` 2, `youth` 2,
`english` 2, `debate` 2, `fantasy` 2, te po 1: `sports`, `f1`, `motorsport`, `engineering`,
`indie-dev`, `design`, `realestate`, `hnl`, `behind-the-scenes`, `basketball`, `nba`, `nfl`, `qa`,
`reprezentacija`, `tennis`.

Duplikati/podvrste za spajanje (u registryju u `../fetch.domovina.tv`, ne ovdje):
`sports`→`sport`, `hnl`/`reprezentacija`→`football`, `regional`≈`regional-media`.

## Logopedija — nema je u katalogu

Regex nad imenom, opisom, tagovima i naslovima epizoda (logoped, mucanje, poremećaj/razvoj
govora, artikulacija, disleksija, autizam, slušn…, speech, stutter) — **nijedan logopedski
kanal**. Samo usputne epizode:

| Kanal | Epizoda |
|---|---|
| Koji faks upisati? | „Zašto je Logopedija najpoželjniji faks?" (2025-09-25) |
| Vox Medicus | Poremećaj iz spektra autizma, S. Šimleša, ERF (2026-06-25) |
| Um&Boom | Život s djetetom s dijagnozom autizma |

Zamke:
- korijen `govorn` je beskoristan (govornik, govoriti) — daje ~15 lažnih pogodaka;
- katalog drži samo **zadnjih 6 epizoda** po kanalu (`EPISODES_PER_CHANNEL`), pa
  klasifikacija po naslovima mora ići nad punim listama u `fetch.domovina.tv`;
- „Dijalog" koji korisnik spominje **nije** u registryju. Jedini „dijalog" u
  `data/discovery/ledger.json` je `UCvnhn2X6nY60rBV1dF8AQLg` — srpski talk podcast
  (ekavica), ručno odbijen 2026-07-27, ušao preko poljoprivrednog upita. Nema veze s logopedijom.

Zaključak: problem je **recall discoveryja** (logopedija nikad nije bila u
`data/discovery/queries.txt`), ne klasifikacija. Detekciju u katalogu može raditi
deterministička skripta; LLM treba tek za rubne slučajeve.

## Otvoreno

- Ciljani discovery prolaz u `../fetch.domovina.tv` (`discover.js all --only-new-queries`
  + web research → `seed`), tag `speech-therapy` u `tag_legend`. Prompt:
  `~/.claude/handoffs/fetch.domovina.tv/2026-10-05-2052-logopedija-discovery.md`.
- Nakon toga ovdje: kategorija „Logopedija" u `CATEGORIES` + `npm run build`.

## Vezani dokumenti

- [Broj epizoda, pratitelji i YouTube embed](2026-10-06-broj-epizoda-i-youtube-embed.md)
