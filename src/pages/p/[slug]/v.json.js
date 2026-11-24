// Epizode jednog kanala za stranicu epizode /p/<slug>/v/<id>. Stranicu slaže Worker
// (worker/index.js) iz ove datoteke, jer bi statična stranica po epizodi bila ~60 000
// datoteka (limit assetsa je 20 000 na free / 100 000 na paid planu).
// Oblik: { name, eps: { <id>: [naslov, datum, minute, naDomovini 0|1] } }
import catalog from "../../../lib/catalog.js";
import allEpisodes from "../../../data/episodes.json";

export function getStaticPaths() {
    return catalog.podcasts
        .filter(p => (allEpisodes[p.slug] || []).length > 0)
        .map(p => ({ params: { slug: p.slug }, props: { p } }));
}

export function GET({ props: { p } }) {
    const eps = {};
    for (const e of allEpisodes[p.slug]) eps[e.id] = [e.title, e.date, e.min || 0, e.dom ? 1 : 0];
    return new Response(JSON.stringify({ name: p.name, eps }), { headers: { "Content-Type": "application/json" } });
}
