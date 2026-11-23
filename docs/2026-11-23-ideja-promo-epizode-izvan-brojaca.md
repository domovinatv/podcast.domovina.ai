# Ideja: [PROMO] i isječci izvan brojača na /dani/ (23. 11. 2026., nije odlučeno)

**Stanje:** podcast.domovina.ai epizode s „[PROMO]” u naslovu i dalje broji
kao nove epizode. Odluka od 23. 11. 2026. glasi: zasad ostaje tako, a pipeline
ih preskače. Ovo je zapis za moguće kasnije gašenje.

## Razlika

- `automatic/watch_candidates.js` u fetch repou klasificira po naslovu. Epizoda s
  „[PROMO]” je `cls: "derivative"`, razlog „naslov (isječak/najava/…)”. Zato
  je `enqueue_all_new.js` ne šalje u obradu i nikad ne dođe na domovina.ai.
- `backfill_days.js` (`backfill.json` `originals`) istu epizodu drži kao
  original. `scripts/build-catalog.mjs` čita taj backfill, pa je broji u `/dani/`.

Primjeri: `UPnlK2aS8JU` („Freedom24 - analiza platforme [PROMO]”, Financije i
samo Financije, 16. 11.) i jedna epizoda 22. 11. Zbog toga se brojač
domovina.ai/dani/ i ovdašnji za te dane razlikuju za po jednu epizodu.

## Ako se gasi

Kod gašenja treba isto pravilo na oba mjesta. Najjednostavnije je da
`archiveEpisodes` u `build-catalog.mjs` izbaci epizodu kojoj je u
`watch-state.json` (`channels.<slug>.seen.<id>.cls`) zapisano `derivative`.
Druga mogućnost je da `backfill_days.js` primijeni isti naslovni filtar. Tada
se domovina.ai/dani/ i podcast.domovina.ai/dani/ poklapaju i u tim danima.
