# Broj epizoda, pratitelji uz sort i YouTube embed (2026-10-06)

Commit `fa4dc82`, deploy verzija `a2357b41`.

## Odakle broj epizoda

Za većinu kanala **nemamo točan ukupan broj epizoda**. Redom izvora u `scripts/build-catalog.mjs`:

| Izvor | Kad | Pouzdanost |
|---|---|---|
| `video_count` iz CDN bundlea | kanal na domovina.ai | točno (50 kanala) |
| `metadata.episode_count` / `episodes_estimate` u registryju | ako ≥ viđenih originala | procjena, zna biti stara (83 kanala je ima) |
| broj `cls: "original"` u `watch-state.json` | inače | donja granica ako je baseline pun |

Zamka: `automatic/watch_candidates.js` pri prvom prolazu povuče **najviše 60 videa**
(`--baseline-items`, default 60). Kanal s ≥60 baseline zapisa ima više epizoda nego što
vidimo, pa dobiva `episodeCountMin: true` i prikaz „N+ ep.". Stanje 2026-10-06:
468/476 kanala ima broj, 178 od njih s „+", 8 bez ičega.

Ostali registry signali (`episodes_sampled`, `activity.episodes_on_disk`) nisu ukupni broj —
ne koristiti ih za to.

**Otvoreno:** za točan broj trebao bi `channel_follower_count`-style podatak o broju videa
s YouTubea (npr. yt-dlp `--flat-playlist` nad `/videos`), što je mrežni posao u fetch repou,
ne ovdje.

## Sort „Najpraćeniji"

Red ima u desnom stupcu i `<time>` i `.row-fol`; `app.js` postavi `.panels[data-sort]`, a CSS
prikaže jedno od dvoje. Pratitelji su `followers` iz bundlea ili `metadata.subscribers`
(315/476 ih ima, ostali „—").

## YouTube embed (kao christendom.app)

`src/scripts/player.js`, uključen iz `app.js` i iz `/p/[slug].astro`.

- Samo epizode kanala koji **nisu** na domovina.ai (`a[data-yt]`); domovina epizode i dalje
  vode na `domovina.ai/v/<id>`.
- Detalj kanala: svira na mjestu (`.dep.playing`). Feed: dijalog `#player` (sličica 112 px je premala).
- `youtube-nocookie.com/embed/<id>?autoplay=1&rel=0&playsinline=1`. Autoplay radi samo na pravi
  klik (user gesture); programski `.click()` u testu ostavi video na pauzi.
- `href` ostaje na YouTube: ⌘/Ctrl-klik, srednji klik i rad bez JS-a otvaraju YouTube.

Zamka: u testu kroz claude-in-chrome `close` event dijaloga se **nije okinuo** nakon
`dlg.close()` pa je iframe ostao (i svirao bi u skrivenom elementu). Zato se iframe uklanja
izravno u click handleru prije `close()`, a `cancel`/`close` su samo dodatna mreža.

**Neprovjereno:** zatvaranje playera tipkom Esc — sintetički Escape iz ekstenzije nije zatvorio
dijalog; na pravoj tipkovnici nije testirano. Mobilni prikaz (`#player` 100vw) nije gledan na uređaju.

## Eksperiment: isti video kroz domovina.ai player (`/yt/<id>`)

domovina.ai od v2.0.169 ima rutu `/yt/<videoId>` koja pušta bilo koji YouTube video kroz
službeni embed, uz gumb na obrađenu epizodu ako za taj video postoji `summary.json`
(opis u `../domovina.ai/CLAUDE.md` i `docs/plans/2026-10-06-youtube-bez-reklama-plan-b.md`
tog repoa). Ovdje je to **dodatak** uz postojeći embed, ne zamjena, da se dva puta mogu
usporediti:

- Detalj kanala: poveznica `.dep-dom` „Gledaj na domovina.ai ↗" je sestra `.dep` kartice
  (ne smije biti unutar nje, ugniježđeni `<a>` nije valjan) i vidi se samo dok kartica svira
  (`.dep.playing + .dep-dom`).
- Feed dijalog `#player`: druga poveznica uz „Otvori na YouTubeu".
- Klik na bilo koju od njih gasi lokalni embed (dva playera ne smiju svirati odjednom).
- URL se slaže na dva mjesta: `domovinaPlayerUrl` u `lib/catalog.js` i kopija u
  `scripts/player.js` (klijentski skript ne smije uvesti `catalog.js`, jer bi povukao
  cijeli `catalog.json` u bundle).

Provjereno u Braveu na `/p/game-changers-podcast/` (lokalno) i u produkciji (HTML sadrži
`domovina.ai/yt/<id>`). **Nije gledan** dijalog na početnoj u pregledniku. Otvoreno: odluka
ostaje li ovo, postaje li primarni klik, ili se miče. `/yt/` na domovina.ai nema `noindex`
ni OG inject, a native WebView varijanta nije isprobana na uređaju.

## Vezani dokumenti

- [Kategorije i logopedija](2026-10-05-kategorije-i-logopedija.md)
